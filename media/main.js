(function () {
    const vscode = acquireVsCodeApi();

    //#region UTILS
    // kudos to beloved jquery
    var $ = function (id) { return document.getElementById(id); };
    //#endregion UTILS

    //#region WINBOX
    var winbox = new WinBox({
        title: "Properties", x: "10px", y: "10px", class: ["no-full"]
    });
    winbox.body.innerHTML = /*html*/`
        <div id="nodes" class="">
            <label class="label">Nodes</label><br>
            <input class="input" type="text" id="state_label" value="State"><br>
            <input class="input" type="color" id="state_color" value="#ae5e17"><br>
        </div>
        <div id="edges" class=""></div>
        `;
    winbox
        // .hide()
        .hide()
        .setBackground("#1F1F1F")
        .removeControl("wb-max")
        .removeControl("wb-full")
        .removeControl("wb-close")
        .resize("300px", "200px");

    function winboxToogle() {
        winbox.hidden ?
            winbox.show() :
            winbox.hide();
    }

    //#endregion WINBOX

    //#region Keyboard shortcuts
    document.addEventListener("keydown", function (e) {
        var ctrl = (e.ctrlKey);
        var alt = (e.altKey);
        if (e.key === 's' && ctrl) { e.preventDefault();/* console.log('ctlr+s'); */ }
        else if (e.key === 'j' && ctrl) { e.preventDefault();/* console.log('ctlr+j'); */winboxToogle(); }
        else if (e.key === 'k' && ctrl) { e.preventDefault();/* console.log('ctlr+k'); */ }
        else if (e.key === 'd') { e.preventDefault();/* console.log('ctlr+k'); */ network.deleteSelected(); }
        else if (e.key === 'l' && ctrl) { e.preventDefault();/* console.log('ctlr+l'); */ network.fit({ animation: { duration: 1000, easingFunction: "easeInOutQuad" } }); }
        else if (e.key === 'l' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ addEdge(); }
        else if (e.key === 'a') { e.preventDefault();/* console.log('ctlr+m'); */ network.addEdgeMode({label:"action"}); }
        else if (e.key === 'p') { e.preventDefault(); winboxToogle(); }
        else if (e.key === 'i' && ctrl) { e.preventDefault(); console.log(Math.max(...nodes.getIds())); }
        else if (e.key === 'u' && ctrl) { e.preventDefault();/* console.log('ctlr+u'); */ }
        else if (e.key === 'z' && ctrl) { e.preventDefault();/* console.log('ctlr+z'); */ }
        else if (e.key === 'f' && ctrl) { e.preventDefault();/* console.log('ctlr+f'); */ focusNode(); }
    }, false);
    //#endregion Keyboard shortcuts

    //#region Data
    var nC = "#0078D4";
    var eC = "#0078D4";
    const nodes = new vis.DataSet([
        { id: 1, label: 'Node 1', x: '29', y: '-87', color: nC },
        { id: 2, label: 'Node 2', x: '-121', y: '127', color: nC },
        { id: 3, label: 'Node 3', x: '290', y: '124', color: nC },
        { id: 4, label: 'Node 4', x: '-271', y: '-54', color: nC },
        { id: 5, label: 'Node 5', x: '363', y: '-78', color: nC },
    ]);
    // node_ids = nodes.getIds();
    const edges = new vis.DataSet([
        { from: 1, to: 2, label: "action", color: eC },
        { from: 1, to: 3, label: "action", color: eC },
        { from: 2, to: 3, label: "action", color: eC },
        { from: 2, to: 4, label: "action", color: eC },
        { from: 3, to: 5, label: "action", color: eC }
    ]);
    // edge_ids = edges.getIds()
    //#endregion Data
    var changeChosenEdge = function (values, id, selected, hovering) {
        // values.width = 3;
        values.color = "#3aa73a";
        // values.toArrowScale = 2;
        // values.arrowStrikethrough = false;
    };
    var changeChosenNode = function (values, id, selected, hovering) {
        // values.width = 3;
        values.color = "#3aa73a";
        // values.toArrowScale = 2;
        // values.arrowStrikethrough = false;
    };
    //#region Network options
    const options = {
        nodes: {
            chosen: { label: false, node: changeChosenNode },
            shape: 'box',
            // size: 30,
            font: {
                size: 14,
                face: "Segoe UI",
                color: "white"
            },
            borderWidth: 1
        },
        edges: {
            "smooth": {
                "type": "curvedCCW",
                "roundness": 0.2
            },
            font: { align: "top", color: "white", size: 14, face: "Segoe UI", strokeWidth: 0 },
            // chosen: {
            //     label: function (values, id, selected, hovering) {
            //         values.size = 18;
            //     }
            // },
            chosen: { label: false, edge: changeChosenEdge },
            // selectionWidth: 2,
            // highlight:"red",
            arrowStrikethrough: false,
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 1,
                    type: "arrow"
                },
            },
        },
        physics: { enabled: false },
        // layout: { randomSeed: 2 },
        interaction: {
            hover: true,
            multiselect: true
        },
    };
    //#endregion Network options

    //#region Create network
    const container = document.getElementById('network');
    const data = {
        nodes: nodes,
        edges: edges
    };
    const network = new vis.Network(container, data, options);


    network.addEventListener("click", function (e) {
        if (e.event.srcEvent.altKey) {
            addNode(e.pointer.canvas.x, e.pointer.canvas.y);
        }
    });

    var selectedNodes;
    var selectedNodesObj;
    network.addEventListener('selectNode', function () {
        selectedNodes = network.getSelectedNodes();
        console.log("nodes", selectedNodes);
        console.log("nodes+", nodes.get(selectedNodes));
        console.log("positions: ", network.getPositions());
    });

    var selectedEdges;
    var selectedEdgesObj;
    network.addEventListener('selectEdge', function () {
        selectedEdges = network.getSelectedEdges();
        console.log("edges", selectedEdges);
        console.log("edges+", edges.get(selectedEdges));
    });

    var hover = false;
    network.addEventListener('hoverNode', function (params) {
        hover = true;
        console.log("hover", params.node);
        // $("wb_title").innerHTML = params.node

    });
    network.addEventListener('blurNode', function (params) {
        hover = false;
        console.log("blur", params.node);
    });
    //#endregion Events

    //#region Node utils

    function focusNode() {
        if (selectedNodes) {
            var options = { animation: { duration: 1000, easingFunction: "easeInOutQuad" } };
            var node = selectedNodes[0];
            console.log("selected nodes [0]:", selectedNodes[0]);
            console.log("focus");
            network.focus(node, options);
        }
    }

    function addEdge(from, to) {
        if (selectedNodes.length === 2) {
            edges.update([{ from: selectedNodes[0], to: selectedNodes[1], label: "action", color: eC }]);
        }
    }
    function addNode(x, y) {
        var newId = Math.max(...nodes.getIds()) + 1;
        nodes.update([{ id: newId, label: 'New Node', x: x, y: y, color: nC }]);
    }

    function updateNodes() {

    }

    function updateEdges() {

    }
    //#endregion Node utils

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'talkToMe':
                console.log("talkToMe");
            break;
        }
    });
}());
