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
            <div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
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

    document.getElementById("winbox-1").addEventListener('dblclick', function (e) {
            console.log("winbox dblclick event");
            e.preventDefault();
            e.stopPropagation();
        });
    // winbox.addEventListener('dblclick', function () {
    //     console.log("winbox dblclick");
    //     return false;
    // });
    //#endregion WINBOX

    //#region Keyboard shortcuts
    function prepareJSON() {
        var jsonNodes = JSON5.stringify(nodes.get());
        var jsonEdges = JSON5.stringify(edges.get());
        // var jsonNodes = JSON5.stringify(nodes.get(), replaceStringWithNumber);
        // var jsonEdges = JSON5.stringify(edges.get(), replaceStringWithNumber);
        // var mydata = (jsonNodes+","+jsonEdges);
        var mydata = ('{\n"nodes":' + jsonNodes + ',\n"edges":' + jsonEdges + '\n}')
            .replace(/\],\[/g, "],\n[")
            .replace(/\[\{/g, "[\n\t\t{")
            .replace(/\},\{/g, "},\n\t\t{")
            .replace(/\}\]/g, "}\n\t]");
        // console.log(mydata);
        console.log("json5 data:",mydata);
        return mydata;
    }

    function replaceStringWithNumber(key, value) {
        if (!isNaN(value)) {
            let change = parseFloat(value);
            return change;
        }
        return value;
    }

    let addEdgeModeState = false;
    function toogleEdgeMode() {
        if (addEdgeModeState === false) { network.addEdgeMode(); addEdgeModeState = true; }
        else { network.disableEditMode(); addEdgeModeState = false; }
        console.log("edge mode state: ", addEdgeModeState);
    }

    document.addEventListener("keydown", function (e) {
        var ctrl = (e.ctrlKey);
        var alt = (e.altKey);
        if (e.key === 's' && ctrl) { e.preventDefault();/* console.log('ctlr+s'); */ }
        else if (e.key === 'j' && ctrl) { e.preventDefault();/* console.log('ctlr+j'); */winboxToogle(); }
        else if (e.key === 'k' && ctrl) { e.preventDefault();/* console.log('ctlr+k'); */ console.log(extNodeArray); }
        // else if (e.key === 'f' && ctrl) { e.preventDefault();/* console.log('ctlr+f'); */ console.log(sm.actions()); network.selectNodes([sm.state()]); }
        else if (e.key === 'd') { e.preventDefault();/* console.log('ctlr+k'); */ network.deleteSelected(); }
        else if (e.key === 'l' && ctrl) { e.preventDefault();/* console.log('ctlr+l'); */ network.fit({ animation: { duration: 1000, easingFunction: "easeInOutQuad" } }); }
        else if (e.key === 'a') { e.preventDefault();/* console.log('ctlr+m'); */ toogleEdgeMode(); }
        else if (e.key === 'p') { e.preventDefault(); winboxToogle(); }
        else if (e.key === 'i' && ctrl) { e.preventDefault(); console.log(Math.max(...nodes.getIds())); }
        else if (e.key === 'u' && ctrl) { e.preventDefault();/* console.log('ctlr+u'); */ vscode.postMessage({ command: 'alert', text: '🐛 Poruka iz iframe-a u vscode ' }); }
        else if (e.key === 'h' && ctrl) { e.preventDefault();/* console.log('ctlr+u'); */ $('fi').classList.toggle("active"); }
        else if (e.key === 'z' && ctrl) { e.preventDefault();/* console.log('ctlr+z'); */ }
        else if (e.key === 'w' && alt) { e.preventDefault();/* console.log('ctlr+t'); */ focusNode(); }
        else if (e.key === 'l' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ addEdge(); }
        else if (e.key === 'č' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ prepareJSON(); }
        else if (e.key === 'ć' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ sendNodesToCode(prepareJSON()); }
    }, false);
    //#endregion Keyboard shortcuts

    var fsm;

    var nodeArray = [];
    const nodes = new vis.DataSet(nodeArray);

    // var edgeArray = extEdgeArray;
    var edgeArray = [];
    const edges = new vis.DataSet(edgeArray);

    //#endregion Data
    var changeChosenEdge = function (values, id, selected, hovering) {
        values.width = 3;
        values.color = "#3aa73a";
        // values.toArrowScale = 2;
        // values.arrowStrikethrough = false;
    };
    var changeChosenNode = function (values, id, selected, hovering) {
        values.borderWidth = 10;
        values.borderColor = "#3aa73a";
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
                "roundness": 0.15
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
        manipulation: {
            enabled: false,
            addEdge: function (edgeData, callback) {
                if (edgeData.from !== edgeData.to) {
                    customAddEdgeMode(edgeData.from, edgeData.to);
                }
                network.addEdgeMode();
            }
        }
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

    network.addEventListener("dragEnd", function (e) {
        // ovdje bi mogao poslati updated node JSON
        network.storePositions();
    });

    var selectedNodes;
    var selectedNodesObj;
    network.addEventListener('selectNode', function () {
        // ovdje bi mogao poslati selected Nodes za highlight u JSON
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
        console.log("all edges", edges.get());
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
            var options = { animation: { duration: 1000, easingFunction: "easeInOutQuad" }, scale: 1 };
            var node = selectedNodes[0];
            // console.log("selected nodes [0]:", selectedNodes[0]);
            // console.log("focus");
            network.focus(node, options);
        }
    }

    function customAddEdgeMode(from, to) {
        let filteredEdges = [];
        let allEdges = edges.get();
        for (let i = 0; i < edges.length; i++) {
            if (allEdges[i].from === from && allEdges[i].to === to) {
                filteredEdges = [...filteredEdges, allEdges[i]];
            }
        }
        if (filteredEdges.length === 0) {
            var newId = Math.max(...(edges.getIds().map(elem=> parseInt(elem, 10)))) + 1 + "a";
            console.log("new edge id",newId);
            edges.update([{ id: newId, $:2,from: from, to: to, name:newId, label: "action", color: "#0078D4" }]);
        }
    }


    function addEdge(from, to) {
        if (selectedNodes.length === 2) {
            console.log("adding edge");
            var newId =  Math.max(...(edges.getIds().map(elem=> parseInt(elem, 10)))) + 1 + "a";
            console.log("new edge id",newId);
            edges.update([{ id: newId, $: 2, from: selectedNodes[0], to: selectedNodes[1], name:newId, label: "action", color: "#0078D4" }]);
        }
    }

    function addNode(x, y) {
        var newId = Math.max(...(nodes.getIds().map(elem=> parseInt(elem, 10)))) + 1 + "a";
        console.log("new node id",newId);
        nodes.update([{ id: newId, $:1, label: 'New Node', x: x, y: y, color: "#0078D4" }]);
    }

    function updateNodes() {

    }

    function updateEdges() {

    }

    // send data to vscode:
    function sendNodesToCode(data) {
        // vscode.postMessage({command: 'nodes', text: JSON.stringify(obj)});
        vscode.postMessage({ command: 'nodes', text: data });
    }
    //#endregion Node utils


    // ok, ovdje pošaljem JSON u iframe
    // ok, let think in terms of state
    // first state: nothing is opened
    // only smgraph.js is opened
    // only smgraph is opened
    // both are opened 
    // da li mogu to provjeriti odavdje?
    // ne, to bi trebao provjeriti u extension.js
    // tamo dakle trebam postaviti logiku za slanje podataka, webview neka samo prima podatke 
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        // console.log("message: ", message.data);
        if (typeof message.data === "undefined") {
            console.log("don't do anything for now...");
        }
        else {
            switch (message.command) {
                case 'sendDataToWebview':
                    console.log(message.data);
                    // nodeArray = message.data.nodes;
                    // edgeArray = message.data.edges;
                    nodes.update(message.data.nodes);
                    edges.update(message.data.edges);
                    //state machine
                    // var trans = JSON.stringify(edges.get());
                    // smtrans = JSON.parse(trans);
                    // const rewriteList = ['label'];
                    // const label = "label";
                    // function replacer(key, value) {
                    //     if (typeof value === 'object' && !value[Symbol.iterator]) {
                    //         rewriteList.forEach(prop => {
                    //             if (value[prop]) {
                    //                 value.action = value[prop];
                    //                 delete value[prop];
                    //             }
                    //         });
                    //     }
                    //     return value;
                    // }
                    // var newTrans = JSON.stringify(smtrans, replacer);
                    // finalTrans = JSON.parse(newTrans);
                    // console.log("SM Edges", finalTrans);
                    // jssmdata = { start_states: [1], end_states: [5], transitions: finalTrans };
                    var transitions = edges.get();
                    console.log("transitions: ",transitions);
                    // const unquoted = trans.replace(/"([^"]+)":/g, '$1:');
                    fsm = new StateMachine({init: "1a", transitions: transitions, methods: {}});
                    console.log("ALL STATES: ",fsm.allStates());
                    console.log("ALL TRANSITIONS: ", fsm.allTransitions());
                    // sm = new jssm.Machine(jssmdata);
                    // // end state machine
                    // upravo razmišljam, da se prebacim na javascript-state-machine...
                    // 8kb vs 350 kb je velika razlika... možda se i zato ext. tako dugo louda...?
                    network.fit({ animation: { duration: 1000, easingFunction: "easeInOutQuad" } });
                    break;
                case 'highlightNodeOnGraph':
                    console.log("Node to highlight: ", message.data);
                    network.unselectAll();
                    network.selectNodes([message.data]/*, { highlightEdges: false }*/);
                    // network.fit({ nodes: [message.data], animation: { duration: 1000, easingFunction: "easeInOutQuad" } });
                    break;
                case 'highlightEdgeOnGraph':
                    console.log("Edge to highlight: ", message.data);
                    network.unselectAll();
                    network.selectEdges([message.data]);
                    // network.fit({ animation: { duration: 1000, easingFunction: "easeInOutQuad" } });
                    break;
            }
        }
    });
}());
