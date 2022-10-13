export const state = {
    toolById: {},
    toolsList: [],
};

import Vue from "vue";
import { getAppRoot } from "onload/loadConfig";
import axios from "axios";

const getters = {
    getToolForId: (state) => (toolId) => {
        return state.toolById[toolId];
    },
    getToolNameById: (state) => (toolId) => {
        const details = state.toolById[toolId];
        if (details && details.name) {
            return details.name;
        } else {
            return "...";
        }
    },
    getTools: (state) => () => state.toolsList.length === 0 ? [] : state.toolsList,
};

const actions = {
    fetchToolForId: async ({ commit }, toolId) => {
        console.log("fetching tool");
        const { data } = await axios.get(`${getAppRoot()}api/tools/${toolId}`);
        commit("saveToolForId", { toolId, toolData: data });
    },
    fetchAllTools: async ({ commit }, { filterSettings }) => {
        if (Object.keys(filterSettings).length !== 0) {
            // Parsing filterSettings to Whoosh query
            let q = "";
            for (const [key, filterValue] of Object.entries(filterSettings)) {
                // Do OR search on name+description field
                if (key == "name") {
                    q += "(" + key + ":(" + filterValue + ") OR description" + ":(" + filterValue + ")) ";
                } else if (key == "id") {
                    q += "id_exact:(" + filterValue + ") ";
                } else {
                    q += key + ":(" + filterValue + ") ";
                }
            }
            return axios
                .get(`${getAppRoot()}api/tools`, {
                    params: { q },
                })
                .then((response) => {
                    const foundTools = response.data;
                    commit("saveTools", { toolsData: foundTools });
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    },
};

const mutations = {
    saveToolForId: (state, { toolId, toolData }) => {
        Vue.set(state.toolById, toolId, toolData);
    },
    saveTools: (state, { toolsData }) => {
        state.toolsList = toolsData;
    },
};

export const toolStore = {
    state,
    getters,
    actions,
    mutations,
};
