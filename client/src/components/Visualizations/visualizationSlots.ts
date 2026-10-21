import { shallowRef } from "vue";

/**
 * Where a pinned visualization shows. An iframe reloads when it moves in the DOM, so a plugin that
 * should keep running while its place changes is mounted once (PinnedVisualization) and drawn over
 * whichever slot is current; a slot only marks the place (VisualizationSlot).
 */
const slots = new Map<string, ReturnType<typeof shallowRef<HTMLElement | null>>>();

/** The element the plugin `name` shows over, or null while no slot for it is mounted. */
export function visualizationSlot(name: string) {
    let slot = slots.get(name);
    if (!slot) {
        slot = shallowRef<HTMLElement | null>(null);
        slots.set(name, slot);
    }
    return slot;
}

/** Make `element` the place `name` shows; returns the release, which leaves a newer slot alone. */
export function claimVisualizationSlot(name: string, element: HTMLElement): () => void {
    const slot = visualizationSlot(name);
    slot.value = element;
    return () => {
        if (slot.value === element) {
            slot.value = null;
        }
    };
}
