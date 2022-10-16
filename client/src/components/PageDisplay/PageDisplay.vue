<template>
    <config-provider v-slot="{ config, loading }">
        <div v-if="!loading">
            <markdown
                v-if="page.content_format == 'markdown'"
                :markdown-config="page"
                :enable_beta_markdown_export="config.enable_beta_markdown_export"
                :download-endpoint="stsUrl(config)"
                :export-link="exportUrl"
                @onEdit="onEdit" />
            <PageHtml v-else :page="page" />
        </div>
    </config-provider>
</template>

<script>
import { safePath } from "utils/redirect";
import { urlData } from "utils/url";
import ConfigProvider from "components/providers/ConfigProvider";
import Markdown from "components/Markdown/Markdown";
import PageHtml from "./PageHtml";

export default {
    components: {
        ConfigProvider,
        Markdown,
        PageHtml,
    },
    props: {
        pageId: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            page: {},
        };
    },
    computed: {
        dataUrl() {
            return `/api/pages/${this.pageId}`;
        },
        exportUrl() {
            return `${this.dataUrl}.pdf`;
        },
        editUrl() {
            return `/page/edit_content?id=${this.pageId}`;
        },
    },
    created() {
        urlData({ url: this.dataUrl }).then((data) => {
            this.page = { ...data };
        });
    },
    methods: {
        onEdit() {
            window.location = safePath(this.editUrl);
        },
        stsUrl(config) {
            return `${this.dataUrl}/prepare_download`;
        },
    },
};
</script>
