/**
 * Geometry of a graph node — the single source of truth for the layout math
 * (ELK placement, connector + edge anchoring) and for GraphNode.vue's CSS,
 * which consumes the exported sizes as CSS custom properties.
 */

/** Fixed height (px) of the node header. */
export const HEADER_HEIGHT = 30;

/** Fixed height (px) of one input/output port row. */
export const PORT_ROW_HEIGHT = 30;

/** Height (px) of the divider drawn between input and output rows. */
export const RULE_HEIGHT = 5;

/** Reserved padding (px) below a tool node's port rows. */
const BODY_PADDING = 8;

/** Fixed height (px) of a dataset/collection node's badge/state body. */
const BADGE_BODY_HEIGHT = 34;

/** Total node height for the given port counts — matches what GraphNode.vue renders. */
export function computeNodeHeight(inputCount: number, outputCount: number, hasBadgeBody: boolean = false): number {
    if (hasBadgeBody) {
        // Dataset/collection node — header plus the badge/state body.
        return HEADER_HEIGHT + BADGE_BODY_HEIGHT;
    }
    if (inputCount === 0 && outputCount === 0) {
        // Header-only node.
        return HEADER_HEIGHT;
    }
    // Tool node — header plus stacked port rows and the input/output divider.
    const portRows = inputCount + outputCount;
    const rule = inputCount > 0 && outputCount > 0 ? RULE_HEIGHT : 0;
    return HEADER_HEIGHT + portRows * PORT_ROW_HEIGHT + rule + BODY_PADDING;
}

/**
 * Vertical offset (px from the node top) of a port's connector — mirrors the row
 * stacking in computeNodeHeight so connectors align with their label rows.
 */
export function portOffsetY(side: "input" | "output", index: number, inputCount: number): number {
    if (side === "input") {
        return HEADER_HEIGHT + index * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2;
    }
    const rule = inputCount > 0 ? RULE_HEIGHT : 0;
    return HEADER_HEIGHT + inputCount * PORT_ROW_HEIGHT + rule + index * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2;
}
