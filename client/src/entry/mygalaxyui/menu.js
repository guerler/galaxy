import _l from "utils/localization";

export function fetchMenu(options = {}) {
    return [
        {
            id: "analysis",
            url: "/?app_name=mygalaxyui",
            tooltip: _l("Tools and Current History"),
            icon: "fa-home",
            target: "_top",
        },
        {
            id: "workflow",
            title: _l("Workflow"),
            tooltip: _l("Chain tools into workflows"),
            url: "/workflows/list",
        },
    ];
}
