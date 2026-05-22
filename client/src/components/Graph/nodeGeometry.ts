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

/**
 * Total node height — the header plus `bodyRows` fixed-height body rows and,
 * for a tool node with both inputs and outputs, the divider between them.
 */
export function computeNodeHeight(bodyRows: number, hasRule: boolean = false): number {
    return HEADER_HEIGHT + bodyRows * PORT_ROW_HEIGHT + (hasRule ? RULE_HEIGHT : 0);
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
