import axios from "axios";

export default {
    props: ["url"],
    data: () => ({
        data: {},
        loaded: false,
    }),
    watch: {
        url() {
            this._getData();
        }
    },
    created() {
        this._getData();
    },
    render() {
        const slot = this.$scopedSlots.default({
            loading: !this.loaded,
            data: this.data,
        });
        return Array.isArray(slot) ? slot[0] : slot;
    },
    methods: {
        _getData() {
            this.loaded = false;
            axios.get(this.url).then(({ data }) => {
                this.data = data;
                this.loaded = true;
                this.$emit("created", data);
            });
        }
    }
};
