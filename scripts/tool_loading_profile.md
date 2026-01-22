# Tool Loading Performance Analysis

**Analysis Date:** 2026-01-22
**Branch:** `tool_profiler`
**Test Environment:** CVMFS-mounted Galaxy tool shed (main.galaxyproject.org)

## Summary

Parallel XML parsing provides a **targeted mitigation for cold CVMFS environments**, reducing standalone tool XML parsing time from **31 minutes to 2 minutes** (13x speedup) for the full Galaxy toolshed (8,869 tools). This addresses the reported 40-minute startup times on CVMFS by parallelizing the I/O-bound XML parsing phase, which accounts for 98.6% of tool loading time on cold cache. This does not measure full Galaxy server startup, which includes additional phases.

## Test Methodology

- **Tool source:** `/cvmfs/main.galaxyproject.org/config/shed_tool_conf.xml` (8,869 tools)
- **Sample sizes:** 100 tools (baseline), 1000 tools (scale test), 8869 tools (full toolshed)
- **Cache reset method:** `sudo umount /cvmfs/main.galaxyproject.org && sudo rm -rf /var/lib/cvmfs/shared/* && sudo mount -t cvmfs main.galaxyproject.org /cvmfs/main.galaxyproject.org`

### Cache Verification

Cache state was verified by comparing I/O latency:
- **Cold cache:** 124-153ms average per file read
- **Warm cache:** 1.0-5.0ms average per file read
- **Ratio:** 30-135x latency difference confirms valid cold/warm cache states

## Full Toolshed Test (8869 tools)

### Sequential (Cold Cache) - Reproduces the 40-minute issue

| Metric | Value |
|--------|-------|
| Tools loaded | 8,869 |
| **Wall clock** | **30:54 (1834s)** |
| get_tool_source (I/O) | 1826.48s (98.6%) |
| Avg per tool | 206.8ms |
| Avg I/O latency | 114.7ms/read |

### Parallel 4 workers (Cold Cache) - Default configuration

| Metric | Value |
|--------|-------|
| Tools loaded | 8,869 |
| **Wall clock** | **8:45 (525s)** |
| Cumulative I/O time | 1984s |
| Avg I/O latency | 125.1ms/read |

### Parallel 8 workers (Cold Cache)

| Metric | Value |
|--------|-------|
| Tools loaded | 8,869 |
| **Wall clock** | **4:49 (289s)** |
| Cumulative I/O time | 2118s |
| Avg I/O latency | 133.6ms/read |

### Parallel 16 workers (Cold Cache)

| Metric | Value |
|--------|-------|
| Tools loaded | 8,869 |
| **Wall clock** | **2:17 (137s)** |
| Cumulative I/O time | 2072s |
| Avg I/O latency | 130.7ms/read |

*Note: Cumulative I/O time exceeds sequential due to thread scheduling overhead and concurrent cache population. Wall clock time is the relevant metric for user-facing performance.*

### Comparison

| Configuration | Wall Clock | Speedup |
|---------------|------------|---------|
| Sequential (cold) | 30:54 | 1x |
| Parallel 4w (cold) | 8:45 | 3.5x |
| Parallel 8w (cold) | 4:49 | 6.3x |
| Parallel 16w (cold) | 2:17 | 13.4x |

**Key finding:** Sequential loading on cold CVMFS cache takes **~31 minutes**, reproducing the reported 40-minute issue. Parallel loading reduces this to **~9 minutes with 4 workers** (3.5x), **~5 minutes with 8 workers** (6.3x), or **~2 minutes with 16 workers** (13x).

### Slowest Tools (Sequential Cold Cache)

| Tool | Load Time | Bottleneck |
|------|-----------|------------|
| multiqc | 5151ms | get_tool_source |
| multiqc | 4128ms | get_tool_source |
| multiqc | 3009ms | get_tool_source |
| segalign | 2386ms | get_tool_source |
| gtdbtk_classify_wf | 1542ms | get_tool_source |

The slowest tools are dominated by I/O latency, not CPU processing.

## Worker Scaling Analysis

### Cold Cache (1000 tools)

| Workers | Parallel XML Time | Speedup vs 2 workers |
|---------|-------------------|----------------------|
| 2 | 113.97s | 1.0x |
| 16 | 17.84s | 6.4x |

### Warm Cache (1000 tools)

| Workers | Parallel XML Time | Notes |
|---------|-------------------|-------|
| 1 | 1.07s | baseline |
| 2 | 0.90s | 1.2x speedup |
| 4 | 0.88s | optimal |
| 8 | 0.99s | thread overhead |
| 16 | 1.02s | diminishing returns |

**Recommendation:** Default to 4 workers (configurable via `parallel_tool_loading_workers`). On warm cache, additional workers add overhead. On cold cache, higher worker counts (8-16) provide benefit, but 4 is a safe, portable default that avoids regression in any scenario.

## Baseline Results (100 tools)

| Test Configuration | Wall Clock | I/O Phase Time | Avg I/O Latency |
|--------------------|------------|----------------|-----------------|
| Sequential (cold)  | 36.3s      | 25.02s         | 129.7ms/read    |
| Parallel 4w (cold) | 22.1s      | 6.44s          | 135.6ms/read    |
| Parallel 4w (warm) | 0.87s      | 0.07s          | 1.0ms/read      |

### Performance Gains (Cold Cache)

- **I/O phase speedup:** 3.9x (25.02s → 6.44s) with 4 workers
- **Total wall clock speedup:** 1.6x (36.3s → 22.1s)

## Scale Test (1000 tools, 16 workers)

| Metric | Cold | Warm | Ratio |
|--------|------|------|-------|
| Wall clock | 50.0s | 2.39s | 21x |
| Parallel XML parsing | 17.84s | 1.03s | 17x |
| Avg I/O latency | 153.1ms | 5.0ms | 31x |
| Cumulative I/O | 281.05s | 9.22s | 30x |

**Effective parallelization (cold):** 281s cumulative I/O completed in 17.84s wall clock = 15.7x

## Phase Breakdown

### Full Toolshed Sequential (8869 tools, Cold Cache)

| Phase | Time | Percentage |
|-------|------|------------|
| get_tool_source (I/O) | 1826.48s | **98.6%** |
| parse_tool_configs | 18.93s | 1.0% |
| pydantic_models | 3.96s | 0.2% |
| parse_tests | 1.72s | 0.1% |
| Other phases | < 2s | < 0.1% |

### Baseline (100 tools, Cold Cache)

**Sequential:**
| Phase | Time | Percentage |
|-------|------|------------|
| get_tool_source (I/O) | 25.02s | 70.8% |
| parse_tool_configs | 10.22s | 28.9% |
| pydantic_models | 0.05s | 0.1% |

**Parallel (4 workers):**
| Phase | Time | Percentage |
|-------|------|------------|
| parse_tool_configs | 15.10s | 69.9% |
| parallel_xml_parsing | 6.44s | 29.8% |
| pydantic_models | 0.02s | 0.1% |

## Conclusions

1. **Reported 40-minute issue reproduced** - Full toolshed sequential loading on cold CVMFS cache takes 31 minutes, confirming the reported problem

2. **13x speedup achieved** - Parallel loading (16 workers) reduces full toolshed loading from 31 minutes to 2 minutes

3. **I/O dominates cold cache startup** - 98.6% of time is spent in file reads (`get_tool_source`) on cold CVMFS cache

4. **4 workers is the safe default** - provides good speedup on cold cache without overhead on warm cache; 16 workers recommended for large deployments

5. **No regression on warm cache** - parallel loading adds negligible overhead (~0.1s) when I/O is fast

6. **This is a targeted mitigation, not a complete solution** - addresses I/O-bound XML parsing only; does not optimize tool panel construction, dependency resolution, or database interactions

## Limitations

This analysis has the following limitations that should be considered:

1. **Synthetic benchmark** - Profiles standalone XML parsing, not full Galaxy startup with config resolution, tool panel construction, and database interactions

2. **Single CVMFS server** - Results may vary with different CVMFS backends, network conditions, or server load

3. **No failure analysis** - Did not measure error rates, file descriptor pressure, or CVMFS retry behavior under parallel load

4. **Cache clearing is destructive** - Test methodology clears system-wide CVMFS cache, which may not represent real cold start scenarios in shared environments

5. **Limited worker scaling data on cold cache** - Full scaling curve would require cache reset between each test

## Usage

```bash
# Sequential loading (default)
python scripts/tool_loading_profile.py \
    --tool-conf /path/to/tool_conf.xml \
    --limit 100

# Parallel loading
python scripts/tool_loading_profile.py \
    --tool-conf /path/to/tool_conf.xml \
    --limit 100 \
    --parallel --workers 4

# Full toolshed test
python scripts/tool_loading_profile.py \
    --tool-conf /cvmfs/main.galaxyproject.org/config/shed_tool_conf.xml \
    --parallel --workers 16

# With cProfile for function-level analysis
python scripts/tool_loading_profile.py \
    --tool-conf /path/to/tool_conf.xml \
    --cprofile --output profile.stats
```
