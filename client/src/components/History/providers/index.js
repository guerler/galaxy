/**
 * Providers are renderless components that take raw inputs and monitor the
 * cache or other observables to emit end results as slot props.
 */

// The DscProvider is only complex because we store dataset collection data in
// two places depending on its place in the data hierarchy. At the root level, a
// dataset collection is stored as history content. But a collection can nest
// other collections, and sub-collections are stored as collection-content
export { default as DscProvider } from "./DscProvider";

// Management for current user's histories. Largely a passthrough of store methods
export { default as UserHistories } from "./UserHistories";

// list management functionality
export { default as ExpandedItems } from "./ExpandedItems";
export { default as SelectedItems } from "./SelectedItems";
