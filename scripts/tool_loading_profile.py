#!/usr/bin/env python
"""
Profile Galaxy tool loading to identify bottlenecks.

This script profiles the tool loading process without starting a full Galaxy server.
It measures time spent in each phase of tool loading.

Usage:
    # Profile with default Galaxy config
    python scripts/tool_loading_profile.py

    # Profile with specific config
    python scripts/tool_loading_profile.py --config config/galaxy.yml

    # Profile specific tool configs
    python scripts/tool_loading_profile.py --tool-conf config/tool_conf.xml

    # Limit number of tools to profile
    python scripts/tool_loading_profile.py --limit 100

    # Use cProfile for detailed function-level profiling
    python scripts/tool_loading_profile.py --cprofile --output profile.stats

Output:
    Timing breakdown for each phase of tool loading, sorted by total time.
"""

import argparse
import cProfile
import logging
import os
import pstats
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from io import StringIO
from typing import Any, Optional

# Add lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)-5.5s [%(name)s] %(message)s",
)
log = logging.getLogger("tool_profile")


class PhaseTimer:
    """Simple timer for tracking time in different phases."""

    def __init__(self):
        self.totals = defaultdict(float)
        self.counts = defaultdict(int)
        self.current_tool = None
        self.tool_times = []
        self.tool_start = None

    def start_tool(self, tool_path: str):
        self.current_tool = {"path": tool_path}
        self.tool_start = time.perf_counter()

    def end_tool(self, tool_id: str = None):
        if self.tool_start:
            total = time.perf_counter() - self.tool_start
            self.current_tool["total"] = total
            self.current_tool["tool_id"] = tool_id
            self.tool_times.append(self.current_tool)
            self.totals["_tool_total"] += total
            self.counts["_tool_total"] += 1
        self.current_tool = None
        self.tool_start = None

    def time_phase(self, phase: str, elapsed: float):
        self.totals[phase] += elapsed
        self.counts[phase] += 1
        if self.current_tool:
            self.current_tool[phase] = elapsed

    def report(self):
        print("\n" + "=" * 70)
        print("TOOL LOADING PROFILE SUMMARY")
        print("=" * 70)

        num_tools = self.counts.get("_tool_total", 0)
        total_time = self.totals.get("_tool_total", 0)
        print(f"\nTools loaded: {num_tools}")
        print(f"Total time: {total_time:.2f}s")
        if num_tools > 0:
            print(f"Average per tool: {total_time/num_tools*1000:.1f}ms")

        print("\n--- Time by Phase ---")
        # Sort phases by total time
        sorted_phases = sorted(
            [(k, v) for k, v in self.totals.items() if not k.startswith("_")],
            key=lambda x: -x[1]
        )

        phase_total = sum(v for k, v in self.totals.items() if not k.startswith("_"))
        for phase, phase_time in sorted_phases:
            count = self.counts[phase]
            avg = phase_time / count if count > 0 else 0
            pct = (phase_time / phase_total * 100) if phase_total > 0 else 0
            print(f"  {phase:30s}: {phase_time:7.2f}s ({pct:5.1f}%) "
                  f"[{count:5d} calls, {avg*1000:6.1f}ms avg]")

        print("\n--- Top 20 Slowest Tools ---")
        slowest = sorted(self.tool_times, key=lambda x: -x.get("total", 0))[:20]
        for tool in slowest:
            tool_id = tool.get("tool_id") or os.path.basename(tool.get("path", "unknown"))
            total = tool.get("total", 0)

            # Find the slowest phase for this tool
            phases = [(k, v) for k, v in tool.items()
                     if k not in ("path", "tool_id", "total") and isinstance(v, (int, float))]
            if phases:
                slowest_phase, slowest_time = max(phases, key=lambda x: x[1])
                print(f"  {tool_id:50s}: {total*1000:7.0f}ms "
                      f"(slowest: {slowest_phase}={slowest_time*1000:.0f}ms)")
            else:
                print(f"  {tool_id:50s}: {total*1000:7.0f}ms")


timer = PhaseTimer()

# Track file I/O for CVMFS analysis
file_io_stats = {
    "reads": 0,
    "total_time": 0.0,
    "files": [],
}


def instrument_file_io():
    """Monkey-patch parse_xml to track file I/O timing."""
    from galaxy.util import parse_xml as original_parse_xml
    import galaxy.util

    def tracked_parse_xml(path, *args, **kwargs):
        start = time.perf_counter()
        result = original_parse_xml(path, *args, **kwargs)
        elapsed = time.perf_counter() - start
        file_io_stats["reads"] += 1
        file_io_stats["total_time"] += elapsed
        file_io_stats["files"].append((str(path), elapsed))
        return result

    galaxy.util.parse_xml = tracked_parse_xml
    # Also patch in xml_macros module
    try:
        import galaxy.util.xml_macros
        galaxy.util.xml_macros.parse_xml = tracked_parse_xml
    except ImportError:
        pass


def timed(phase_name: str):
    """Decorator to time a function call."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                elapsed = time.perf_counter() - start
                timer.time_phase(phase_name, elapsed)
        return wrapper
    return decorator


def profile_tool_loading(
    config_file: str = None,
    tool_conf_files: list = None,
    tool_path: str = None,
    limit: int = None,
    parallel: bool = False,
    workers: int = 4,
):
    """Profile tool loading with timing instrumentation."""
    # Instrument file I/O before importing tool parsing
    instrument_file_io()

    from galaxy.tool_util.parser import get_tool_source
    from galaxy.tool_util.toolbox.parser import get_toolbox_parser

    # Find tool config files
    if tool_conf_files:
        config_files = tool_conf_files
    else:
        # Default locations
        default_paths = [
            "config/tool_conf.xml",
            "config/shed_tool_conf.xml",
        ]
        config_files = [p for p in default_paths if os.path.exists(p)]

    if not config_files:
        log.error("No tool config files found")
        return

    log.info(f"Tool config files: {config_files}")

    # Collect all tool paths
    all_tool_paths = []
    for conf_file in config_files:
        log.info(f"Parsing config: {conf_file}")
        start = time.perf_counter()

        try:
            conf_source = get_toolbox_parser(conf_file)
            conf_tool_path = conf_source.parse_tool_path() or tool_path or "tools"

            def collect_tools(items, base_path):
                paths = []
                for item in items:
                    if hasattr(item, "type"):
                        if item.type == "tool":
                            file_attr = item.get("file")
                            if file_attr:
                                full_path = os.path.join(base_path, file_attr)
                                if os.path.exists(full_path):
                                    paths.append(full_path)
                        elif item.type == "section":
                            if hasattr(item, "items"):
                                paths.extend(collect_tools(item.items, base_path))
                return paths

            paths = collect_tools(conf_source.parse_items(), conf_tool_path)
            all_tool_paths.extend(paths)

        except Exception as e:
            log.warning(f"Error parsing {conf_file}: {e}")

        timer.time_phase("parse_tool_configs", time.perf_counter() - start)

    log.info(f"Found {len(all_tool_paths)} tools")

    if limit:
        all_tool_paths = all_tool_paths[:limit]
        log.info(f"Limiting to {limit} tools")

    # Parallel pre-loading if enabled
    preloaded_sources = {}
    if parallel:
        log.info(f"Pre-parsing tool XML in parallel with {workers} workers...")
        start = time.perf_counter()

        def parse_tool_source(tp: str) -> tuple:
            """Parse a single tool XML file."""
            try:
                return (tp, get_tool_source(tp))
            except Exception as e:
                log.debug(f"Error parsing {tp}: {e}")
                return (tp, None)

        with ThreadPoolExecutor(max_workers=workers) as executor:
            results = list(executor.map(parse_tool_source, all_tool_paths))

        for tp, source in results:
            if source is not None:
                preloaded_sources[tp] = source

        parallel_time = time.perf_counter() - start
        timer.time_phase("parallel_xml_parsing", parallel_time)
        log.info(f"Parallel pre-parsing complete: {len(preloaded_sources)} sources in {parallel_time:.2f}s")

    # Profile each tool
    for i, tool_path in enumerate(all_tool_paths):
        if i > 0 and i % 100 == 0:
            log.info(f"Processed {i}/{len(all_tool_paths)} tools...")

        timer.start_tool(tool_path)
        tool_id = None

        try:
            # Phase 1: Read and expand XML (get_tool_source)
            start = time.perf_counter()
            if tool_path in preloaded_sources:
                tool_source = preloaded_sources[tool_path]
            else:
                tool_source = get_tool_source(tool_path)
            timer.time_phase("get_tool_source", time.perf_counter() - start)

            # Phase 2: Parse basic attributes
            start = time.perf_counter()
            tool_id = tool_source.parse_id()
            _ = tool_source.parse_name()
            _ = tool_source.parse_version()
            _ = tool_source.parse_description()
            timer.time_phase("parse_basic_attrs", time.perf_counter() - start)

            # Phase 3: Parse inputs (creates parameter tree)
            start = time.perf_counter()
            pages = tool_source.parse_input_pages()
            timer.time_phase("parse_input_pages", time.perf_counter() - start)

            # Phase 4: Create Pydantic parameter models
            start = time.perf_counter()
            try:
                from galaxy.tool_util.parameters.factory import input_models_for_pages
                from galaxy.tool_util.parser.util import parse_profile_version
                profile = parse_profile_version(tool_source)
                _ = input_models_for_pages(pages, profile)
            except Exception:
                pass  # Some tools may fail pydantic model creation
            timer.time_phase("pydantic_models", time.perf_counter() - start)

            # Phase 5: Parse outputs
            start = time.perf_counter()
            _ = tool_source.parse_outputs()
            timer.time_phase("parse_outputs", time.perf_counter() - start)

            # Phase 6: Parse help (only for webapp)
            start = time.perf_counter()
            _ = tool_source.parse_help()
            timer.time_phase("parse_help", time.perf_counter() - start)

            # Phase 7: Parse tests
            start = time.perf_counter()
            try:
                _ = tool_source.parse_tests_to_dict()
            except Exception:
                pass
            timer.time_phase("parse_tests", time.perf_counter() - start)

            # Phase 8: Parse requirements
            start = time.perf_counter()
            _ = tool_source.parse_requirements()
            timer.time_phase("parse_requirements", time.perf_counter() - start)

        except Exception as e:
            log.debug(f"Error profiling {tool_path}: {e}")

        timer.end_tool(tool_id)

    timer.report()

    # Report file I/O stats
    if file_io_stats["reads"] > 0:
        print("\n--- File I/O Statistics ---")
        print(f"  Total file reads: {file_io_stats['reads']}")
        print(f"  Total I/O time: {file_io_stats['total_time']:.2f}s")
        avg_io = file_io_stats['total_time'] / file_io_stats['reads'] * 1000
        print(f"  Average per read: {avg_io:.1f}ms")
        if len(all_tool_paths) > 0:
            reads_per_tool = file_io_stats['reads'] / len(all_tool_paths)
            print(f"  Reads per tool: {reads_per_tool:.1f}")

        # Show slowest file reads
        print("\n--- Top 10 Slowest File Reads ---")
        slowest_files = sorted(file_io_stats["files"], key=lambda x: -x[1])[:10]
        for path, elapsed in slowest_files:
            print(f"  {os.path.basename(path):50s}: {elapsed*1000:7.1f}ms")


def main():
    parser = argparse.ArgumentParser(description="Profile Galaxy tool loading")
    parser.add_argument("--config", help="Galaxy config file")
    parser.add_argument("--tool-conf", action="append", dest="tool_confs",
                       help="Tool config file(s) to profile")
    parser.add_argument("--tool-path", help="Base path for tools")
    parser.add_argument("--limit", type=int, help="Limit number of tools to profile")
    parser.add_argument("--parallel", action="store_true",
                       help="Enable parallel XML parsing")
    parser.add_argument("--workers", type=int, default=4,
                       help="Number of parallel workers (default: 4)")
    parser.add_argument("--cprofile", action="store_true",
                       help="Use cProfile for detailed profiling")
    parser.add_argument("--output", help="Output file for cProfile stats")

    args = parser.parse_args()

    if args.cprofile:
        profiler = cProfile.Profile()
        profiler.enable()

    try:
        profile_tool_loading(
            config_file=args.config,
            tool_conf_files=args.tool_confs,
            tool_path=args.tool_path,
            limit=args.limit,
            parallel=args.parallel,
            workers=args.workers,
        )
    finally:
        if args.cprofile:
            profiler.disable()

            # Print summary
            s = StringIO()
            ps = pstats.Stats(profiler, stream=s).sort_stats("cumulative")
            ps.print_stats(50)
            print("\n" + "=" * 70)
            print("CPROFILE TOP 50 BY CUMULATIVE TIME")
            print("=" * 70)
            print(s.getvalue())

            if args.output:
                profiler.dump_stats(args.output)
                print(f"\nFull stats saved to: {args.output}")
                print(f"View with: python -m pstats {args.output}")


if __name__ == "__main__":
    main()
