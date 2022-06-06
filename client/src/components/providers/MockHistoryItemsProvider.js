const MockHistoryItemsProvider = (fakeItems, fakeCount = 100) => ({
    render() {
        return this.$scopedSlots.default({
            loading: false,
            result: fakeItems,
            count: fakeCount,
        });
    },
});

export default MockHistoryItemsProvider;
