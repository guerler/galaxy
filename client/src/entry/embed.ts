// Mounts a single Galaxy component into a host page, for embedders that want one view
// rather than the analysis application. The host supplies the container and its props:
//
//   <link rel="stylesheet" href="{root}static/dist/base.css">
//   <div id="galaxy-embed" data-component="markdown" data-incoming='{"content": "# hi"}'></div>
//   <script type="module" src="{root}static/dist/embed.bundled.js"></script>
//
// The props are in place before this runs, so there is nothing to wait for and no handshake.
// Mounting is immediate rather than on `load`: a host that writes this container into a frame it
// already owns has passed that event long before the script arrives.
import { initGalaxyInstance } from "@/app";
import { replaceChildrenWithComponent } from "@/utils/mountVueComponent";

const CONTAINER_ID = "galaxy-embed";

// Loaded on demand so each component is its own chunk.
const COMPONENTS: Record<string, () => Promise<{ default: unknown }>> = {
    markdown: () => import("@/components/Markdown/MarkdownStandalone.vue"),
};

function fail(el: HTMLElement | null, message: string) {
    console.error(`galaxy-embed: ${message}`);
    if (el) {
        el.textContent = message;
    }
}

async function mount() {
    const el = document.getElementById(CONTAINER_ID);
    if (!el) {
        return fail(null, `no #${CONTAINER_ID} container on the page`);
    }

    const name = el.dataset.component;
    const load = name ? COMPONENTS[name] : undefined;
    if (!load) {
        return fail(el, `unknown component ${name ?? "(unset)"}; available: ${Object.keys(COMPONENTS).join(", ")}`);
    }

    let props: Record<string, unknown> = {};
    if (el.dataset.incoming) {
        try {
            props = JSON.parse(el.dataset.incoming);
        } catch (e) {
            return fail(el, `data-incoming is not valid JSON: ${e}`);
        }
    }

    await initGalaxyInstance();
    replaceChildrenWithComponent(el, (await load()).default as never, props);
}

mount();
