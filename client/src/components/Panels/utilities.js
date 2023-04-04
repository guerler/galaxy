/**
 * Utilities file for Tool Search (panel/client search + advanced/backend search)
 */
import { orderBy } from "lodash";
import levenshteinDistance from "utils/levenshtein";

const TOOLS_RESULTS_SORT_LABEL = "apiSort";
const TOOLS_RESULTS_SECTIONS_HIDE = ["Expression Tools"];
const STRING_REPLACEMENTS = [" ", "-", "(", ")", "'", ":"];

// - Takes filterSettings = {"name": "Tool Name", "section": "Collection", ...}
// - Takes panelView (if not 'default', does ontology search at backend)
// - Takes toolbox (to find ontology id if given ontology name)
// - Returns parsed Whoosh query
// e.g. fn call: createWhooshQuery(filterSettings, 'ontology:edam_topics', toolbox)
// can return:
//     query = "(name:(skew) name_exact:(skew) description:(skew)) AND (edam_topics:(topic_0797) AND )"
export function createWhooshQuery(filterSettings, panelView, toolbox) {
    let query = "(";
    // add description+name_exact fields = name, to do a combined OrGroup at backend
    const name = filterSettings["name"];
    if (name) {
        query += "name:(" + name + ") ";
        query += "name_exact:(" + name + ") ";
        query += "description:(" + name + ")";
    }
    query += ") AND (";
    for (const [key, filterValue] of Object.entries(filterSettings)) {
        // get ontology keys if view is not default
        if (key === "section" && panelView !== "default") {
            const ontology = toolbox.find(({ name }) => name && name.toLowerCase().match(filterValue.toLowerCase()));
            if (ontology) {
                let ontologyKey = "";
                if (panelView === "ontology:edam_operations") {
                    ontologyKey = "edam_operations";
                } else if (panelView === "ontology:edam_topics") {
                    ontologyKey = "edam_topics";
                }
                query += ontologyKey + ":(" + ontology.id + ") AND ";
            } else {
                query += key + ":(" + filterValue + ") AND ";
            }
        } else if (key == "id") {
            query += "id_exact:(" + filterValue + ") AND ";
        } else if (key != "name") {
            query += key + ":(" + filterValue + ") AND ";
        }
    }
    query += ")";
    return query;
}

// Given toolbox and search results, returns filtered tool results
export function filterTools(tools, results) {
    let toolsResults = [];
    tools = normalizeTools(tools);
    toolsResults = mapToolsResults(tools, results);
    toolsResults = sortToolsResults(toolsResults);
    toolsResults = removeDuplicateResults(toolsResults);
    return toolsResults;
}

// Given toolbox and search results, returns filtered tool results by sections
export function filterToolSections(tools, results) {
    let toolsResults = [];
    let toolsResultsSection = [];
    if (hasResults(results)) {
        toolsResults = tools.map((section) => {
            tools = flattenToolsSection(section);
            toolsResultsSection = mapToolsResults(tools, results);
            toolsResultsSection = sortToolsResults(toolsResultsSection);
            return {
                ...section,
                elems: toolsResultsSection,
            };
        });
        toolsResults = deleteEmptyToolsSections(toolsResults, results);
    } else {
        toolsResults = tools;
    }
    return toolsResults;
}

export function hasResults(results) {
    return Array.isArray(results) && results.length > 0;
}

// Given toolbox, keys to sort/search results by and a search query,
// Does a direct string.match() comparison to find results,
// If that produces nothing, runs levenshtein distance alg to allow misspells
// Returns tool ids sorted by order of keys that are being searched
export function searchToolsByKeys(tools, keys, query, usesDl = false, usesDLAgain = false) {
    const returnedTools = [];
    const minimumQueryLength = 5;
    for (const tool of tools) {
        for (const key of Object.keys(keys)) {
            if (tool[key] || key === "combined") {
                let queryValue = query.trim().toLowerCase();
                let actualValue = "";
                if (key === "combined") {
                    actualValue = (tool.name + tool.description).trim().toLowerCase();
                } else {
                    actualValue = tool[key].trim().toLowerCase();
                }
                STRING_REPLACEMENTS.forEach((rep) => {
                    queryValue = queryValue.replaceAll(rep, "");
                    actualValue = actualValue.replaceAll(rep, "");
                });
                // do we care for exact matches && is it an exact match ?
                const order = keys.exact && actualValue === queryValue ? keys.exact : keys[key];
                if (!usesDl && actualValue.match(queryValue)) {
                    returnedTools.push({ id: tool.id, order });
                    break;
                } else if (queryValue.length >= minimumQueryLength) {
                    if (usesDl && key == "name" && dLDistance(queryValue, actualValue)) {
                        returnedTools.push({ id: tool.id, order });
                        break;
                    } else if (usesDLAgain && key != "name" && dLDistance(queryValue, actualValue)) {
                        returnedTools.push({ id: tool.id, order });
                        break;
                    }
                }
            }
        }
    }
    // no results with string.match(): maybe user misspelled, so try usesDl = true
    if (!usesDl && returnedTools.length == 0) {
        return searchToolsByKeys(tools, keys, query, true);
    } else if (!usesDLAgain && returnedTools.length == 0) {
        return searchToolsByKeys(tools, keys, query, false, true);
    }
    // sorting results by indexed order of keys
    return orderBy(returnedTools, ["order"], ["desc"]).map((tool) => tool.id);
}

function dLDistance(query, toolName) {
    // Max distance a query and tool name substring can be apart
    const maxDistance = 1;
    // Create an array of all toolName substrings that are query length, query length -1, and query length + 1
    const substrings = Array.from({ length: toolName.length - query.length + 1 }, (_, i) =>
        toolName.substr(i, query.length)
    );
    if (query.length > 1) {
        substrings.push(
            ...Array.from({ length: toolName.length - query.length + 2 }, (_, i) =>
                toolName.substr(i, query.length - 1)
            )
        );
    }
    if (toolName.length > query.length) {
        substrings.push(
            ...Array.from({ length: toolName.length - query.length }, (_, i) => toolName.substr(i, query.length + 1))
        );
    }
    // check to see if any substings have a levenshtein distance less than the max distance and return True or False
    for (const substring of substrings) {
        if (levenshteinDistance(query, substring, true) <= maxDistance) {
            return true;
        }
    }
    return false;
}

export function normalizeTools(tools) {
    tools = hideToolsSection(tools);
    tools = flattenTools(tools);
    return tools;
}

export function hideToolsSection(tools) {
    return tools.filter((section) => !TOOLS_RESULTS_SECTIONS_HIDE.includes(section.name));
}

export function removeDisabledTools(tools) {
    return tools.filter((section) => {
        if (section.model_class === "ToolSectionLabel") {
            return true;
        } else if (!section.elems && section.disabled) {
            return false;
        } else if (section.elems) {
            section.elems = section.elems.filter((el) => !el.disabled);
            if (!section.elems.length) {
                return false;
            }
        }
        return true;
    });
}

function flattenToolsSection(section) {
    const flattenTools = [];
    if (section.elems) {
        section.elems.forEach((tool) => {
            if (!tool.text) {
                flattenTools.push(tool);
            }
        });
    } else if (!section.text) {
        flattenTools.push(section);
    }
    return flattenTools;
}

function mapToolsResults(tools, results) {
    const toolsResults = tools
        .filter((tool) => !tool.text && results.includes(tool.id))
        .map((tool) => {
            Object.assign(tool, setSort(tool, results));
            return tool;
        });
    return toolsResults;
}

function removeDuplicateResults(results) {
    const uniqueTools = [];
    return results.filter((tool) => {
        if (!uniqueTools.includes(tool.id)) {
            uniqueTools.push(tool.id);
            return true;
        } else {
            return false;
        }
    });
}

function setSort(tool, results) {
    return { [TOOLS_RESULTS_SORT_LABEL]: results.indexOf(tool.id) };
}

function sortToolsResults(toolsResults) {
    return orderBy(toolsResults, [TOOLS_RESULTS_SORT_LABEL], ["asc"]);
}

function deleteEmptyToolsSections(tools, results) {
    let isSection = false;
    let isMatchedTool = false;
    tools = tools
        .filter((section) => {
            isSection = section.elems && section.elems.length > 0;
            isMatchedTool = !section.text && results.includes(section.id);
            return isSection || isMatchedTool;
        })
        .sort((sectionPrevious, sectionCurrent) => {
            if (sectionPrevious.elems.length == 0 || sectionCurrent.elems.length == 0) {
                return 0;
            }
            return results.indexOf(sectionPrevious.elems[0].id) - results.indexOf(sectionCurrent.elems[0].id);
        });

    return tools;
}

function flattenTools(tools) {
    let normalizedTools = [];
    tools.forEach((section) => {
        normalizedTools = normalizedTools.concat(flattenToolsSection(section));
    });
    return normalizedTools;
}
