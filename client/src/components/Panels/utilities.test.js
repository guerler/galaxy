import toolsList from "components/ToolsView/testData/toolsList";
import { createWhooshQuery, filterTools, filterToolSections, normalizeTools, searchToolsByKeys } from "./utilities";

const tempToolsList = [
    {
        elems: [
            {
                panel_section_name: "FASTA/FASTQ",
                description: "Extract UMI from fastq files",
                id: "toolshed.g2.bx.psu.edu/repos/iuc/umi_tools_extract/umi_tools_extract/1.1.2+galaxy2",
                name: "UMI-tools extract",
            },
            {
                panel_section_name: "FASTA/FASTQ",
                description: "Extract UMI from (fasta files)",
                id: "umi_tools_reduplicate",
                name: "UMI-tools reduplicate",
            },
        ],
        model_class: "ToolSection",
        id: "fasta/fastq",
        name: "FASTA/FASTQ",
    },
];

describe("test helpers in tool searching utilities", () => {
    it("test parsing helper that converts settings to whoosh query", async () => {
        const settings = {
            name: "Filter",
            id: "__FILTER_FAILED_DATASETS__",
            help: "downstream",
        };
        const q = createWhooshQuery(settings, "default", []);

        // OrGroup (at backend) on name, name_exact, description
        expect(q).toContain("name:(Filter) name_exact:(Filter) description:(Filter)");
        // AndGroup (explicit at frontend) on all other settings
        expect(q).toContain("id_exact:(__FILTER_FAILED_DATASETS__) AND help:(downstream)");
    });

    it("test tool search helper that searches for tools given keys", async () => {
        const searches = [
            {
                // description prioritized
                q: "collection",
                expectedResults: [
                    "__FILTER_FAILED_DATASETS__",
                    "__FILTER_EMPTY_DATASETS__",
                    "__UNZIP_COLLECTION__",
                    "__ZIP_COLLECTION__",
                ],
                keys: { description: 1, name: 0 },
                list: toolsList,
            },
            {
                // name prioritized
                q: "collection",
                expectedResults: [
                    "__UNZIP_COLLECTION__",
                    "__ZIP_COLLECTION__",
                    "__FILTER_FAILED_DATASETS__",
                    "__FILTER_EMPTY_DATASETS__",
                ],
                keys: { description: 0, name: 1 },
                list: toolsList,
            },
            {
                // whitespace precedes to ensure query.trim() works
                q: " filter empty datasets",
                expectedResults: ["__FILTER_EMPTY_DATASETS__"],
                keys: { description: 1, name: 2, combined: 0 },
                list: toolsList,
            },
            {
                // hyphenated tool-name is searchable
                q: "uMi tools extract ",
                expectedResults: ["toolshed.g2.bx.psu.edu/repos/iuc/umi_tools_extract/umi_tools_extract/1.1.2+galaxy2"],
                keys: { description: 1, name: 2 },
                list: tempToolsList,
            },
            {
                // parenthesis is searchable
                q: "from FASTA files",
                expectedResults: ["umi_tools_reduplicate"],
                keys: { description: 1, name: 2 },
                list: tempToolsList,
            },
        ];
        searches.forEach((search) => {
            const results = searchToolsByKeys(normalizeTools(search.list), search.keys, search.q);
            expect(results).toEqual(search.expectedResults);
        });
    });

    it("test tool fuzzy search", async () => {
        const expectedResults = ["__FILTER_FAILED_DATASETS__", "__FILTER_EMPTY_DATASETS__"];
        const keys = { description: 1, name: 2, combined: 0 };
        const queries = ["Fillter", " filtr", "FILYER", "Fitler", "datases from a collection", "from a colleection"];
        queries.forEach((q) => {
            const results = searchToolsByKeys(normalizeTools(toolsList), keys, q);
            expect(results).toEqual(expectedResults);
        });
    });

    it("test tool filtering helpers on toolsList given list of ids", async () => {
        const ids = ["__FILTER_FAILED_DATASETS__", "liftOver1"];
        // check length of first section from imported const toolsList
        expect(toolsList.find((section) => section.id == "collection_operations").elems).toHaveLength(4);
        // check length of same section from filtered toolsList
        expect(
            filterToolSections(toolsList, ids).find((section) => section.id == "collection_operations").elems
        ).toHaveLength(1);
        // check length of filtered tools without sections
        expect(filterTools(toolsList, ids)).toHaveLength(2);
    });
});
