(function () {
    const vscode = acquireVsCodeApi();
    //check if webview lost focuse
    // window.addEventListener('blur', function () {
    // console.log("webview lost focus");
    //     vscode.postMessage({ command: 'alert', text: '🐛 I just lost my focus ' });
    // });
    //check if the focus is backd to webview
    // window.addEventListener('focus', function () {
    // console.log("webview gained focus");
    //     vscode.postMessage({ command: 'alert', text: '🐛 I just got my focus back ' });
    //     //send me data
    // });
    //#region UTILS
    // Homage to beloved jquery
    var $ = function (id) { return document.getElementById(id); };
    //#endregion UTILS

    //#region WINBOX
    var winbox = new WinBox({
        title: "Properties", x: "10px", y: "30px", class: ["no-full"], top: "26px", left: "1px", right: "1px", class: ["no-full", "no-max"]
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

    document.getElementById("winbox-1").addEventListener('dblclick', function (e) {
        // console.log("winbox dblclick event");
        e.preventDefault();
        e.stopPropagation();
    });
    // winbox.addEventListener('dblclick', function () {
    // console.log("winbox dblclick");
    //     return false;
    // });
    //#endregion WINBOX

    //#region Keyboard shortcuts
    // TODO ako file ne postoji, treba ga kreirat
    function prepareJSON() {
        // var jsonNodes = JSON5.stringify(nodes.get());
        // var jsonEdges = JSON5.stringify(edges.get());
        var jsonNodes = JSON.stringify(nodes.get(), replaceStringWithNumber);
        var jsonEdges = JSON.stringify(edges.get(), replaceStringWithNumber);
        //ok, ovo je bezveze, jer taj file ne postoji ( i tako ga mogu dodat u extension.ts)
        // console.log("File: " + file);
        // var mydata = (jsonNodes+","+jsonEdges);
        //ok ovo če iči u extension, a poslat ču objekt preko...
        // možda bi stvarno bilo jednostavnije, ako pošaljem objekt preko... i tamo napravim json.stringify
        // na taj nači bi se mogao jednostavno riješiti filename-a
        var mydata = ('{\n"file":"' + file + '",\n"nodes":' + jsonNodes + ',\n"edges":' + jsonEdges + '\n}')
            .replace(/\],\[/g, "],\n[")
            .replace(/\[\{/g, "[\n\t\t{")
            .replace(/\},\{/g, "},\n\t\t{")
            .replace(/\}\]/g, "}\n\t]");
        // console.log(mydata);
        // console.log("json data:", mydata);
        return mydata;
    }

    function sendNodesToCode(mydata) {
        // console.log("sendNodesToCode", mydata);
        vscode.postMessage({ command: 'graph', text: mydata });
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
        // console.log("edge mode state: ", addEdgeModeState);
    }

    // NEKI KEYBOARD SHORTCUTI SAMO ODJEDNOM PRESTANU RADITI !!!
    // MOŽDA TREBA SVE TO PREBACIT U package.json, da riješim jednom za uvijek taj problem....
    // ali onda trebam poslati keyboard shortcut u webview i ovdje napraviti listener...
    // sa time ču dobiti i to, da če keyboard shortcuti raditi svugdje...
    document.addEventListener("keydown", function (e) {
        var ctrl = (e.ctrlKey);
        var alt = (e.altKey);
        if (e.key === 's' && ctrl) { e.preventDefault();/* console.log('ctlr+s'); */ }
        else if (e.key === 'f' && ctrl) { e.preventDefault();/* console.log('ctlr+f'); */ console.log(fsm.transitions.actions); }
        else if (e.key === 'd') { e.preventDefault();/* console.log('ctlr+k'); */ network.deleteSelected(); }
        else if (e.key === 'a' && alt) { e.preventDefault();/* console.log('ctlr+m'); */ toogleEdgeMode(); }
        else if (e.key === 'p') { e.preventDefault(); winboxToogle(); }
        else if (e.key === 'i' && ctrl) { e.preventDefault(); console.log(Math.max(...nodes.getIds())); }
        else if (e.key === 'u' && ctrl) { e.preventDefault();/* console.log('ctlr+u'); */ vscode.postMessage({ command: 'alert', text: '🐛 Poruka iz iframe-a u vscode ' }); }
        else if (e.key === 'h' && ctrl) { e.preventDefault();/* console.log('ctlr+u'); */ $('fi').classList.toggle("active"); }
        else if (e.key === 'z' && ctrl) { e.preventDefault();/* console.log('ctlr+z'); */ }
        else if (e.key === 'w' && alt) { e.preventDefault();/* console.log('ctlr+t'); */ focusNode(); }
        else if (e.key === 'l' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ prepareJSON(); }
        else if (e.key === 'k' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ sendNodesToCode(prepareJSON()); }
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
        // send message with node id to code
        // zapravo treba vidjeti, šta se sve može editirati, pa onda napravim jednu generičnu poruku
        // dobro, ali ovo je nekakav početak, pošaljem samo taj jedan node preko, pa da vidim kako če iči

        selectedNodes = network.getSelectedNodes();
        // console.log("nodes", selectedNodes);
        // console.log("nodes+", nodes.get(selectedNodes));
        // console.log("Ovo bi trebao biti First selected node", JSON.stringify(nodes.get(selectedNodes[0])));
        vscode.postMessage({ command: 'selected', text: [file,JSON.stringify(nodes.get(selectedNodes[0]))] });
        // console.log("positions: ", network.getPositions());
    });

    var selectedEdges;
    var selectedEdgesObj;
    network.addEventListener('selectEdge', function () {
        selectedEdges = network.getSelectedEdges();
        // console.log("edges", selectedEdges);
        // console.log("edges+", edges.get(selectedEdges));
        // console.log("all edges", edges.get());
    });

    var hover = false;
    network.addEventListener('hoverNode', function (params) {
        hover = true;
        // console.log("hover", params.node);
        // $("wb_title").innerHTML = params.node

    });
    network.addEventListener('blurNode', function (params) {
        hover = false;
        // console.log("blur", params.node);
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

    const uid = new ShortUniqueId({ length: 6 });
    const actionId = new ShortUniqueId({ length: 6 });

    function customAddEdgeMode(from, to) {
        let filteredEdges = [];
        let allEdges = edges.get();
        for (let i = 0; i < edges.length; i++) {
            if (allEdges[i].from === from && allEdges[i].to === to) {
                filteredEdges = [...filteredEdges, allEdges[i]];
            }
        }
        if (filteredEdges.length === 0) {
            var newId = uid.rnd();
            var actId = actionId.rnd();
            // console.log("new edge id", newId);
            edges.update([{ id: newId, action: actId, label: "action", color: "#0078D4", from: from, to: to }]);
        }
    }


    function addEdge(from, to) {
        if (selectedNodes.length === 2) {
            // console.log("adding edge");
            var newId = uid.rnd();
            var actId = actionId.rnd();
            // console.log("new edge id", newId);
            edges.update([{ id: newId, action: actId, label: "action", color: "#0078D4", from: selectedNodes[0], to: selectedNodes[1] }]);
        }
    }

    // ok, za id mi treba nešto bolje, ovo je prilično bezveze....
    function addNode(x, y) {
        var newId = uid.rnd();
        // console.log("new node id", newId);
        nodes.update([{ id: newId, label: 'New Node', color: "#0078D4", x: x, y: y }]);
    }

    function updateNodes() {

    }

    function updateEdges() {

    }



    // file name to have it here...
    var file = null;
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        // console.log("message: ", message.data);
        if (typeof message.data === "undefined") {
            // console.log("don't do anything for now...");
        }
        else {
            switch (message.command) {
                case 'json2graph':
                    console.log("json2graph data (iframe): ", message.data);
                    nodes.clear();
                    edges.clear();
                    nodes.add(message.data.nodes);
                    edges.add(message.data.edges);
                    file = message.data.file;
                    // console.log("file: ", file);
                    // FSM
                    //! ok, ovo je bila VELIKA greška, selectedNodes nema veze sa json2graph !!!
                    // var selected = network.getSelectedNodes();
                    // FSM
                    var transitions = edges.get();
                    fsm = new StateMachine({ transitions: transitions, methods: {} });
                    
                    network.fit({ animation: { duration: 1000, easingFunction: "easeInOutQuad" } });
                    // network.selectNodes(selected, { highlightEdges: false });
                    break;
                case 'highlightNodeOnGraph':
                    // console.log("Node to highlight: ", message.data);
                    // network.unselectAll();
                    // console.log("Node ID (iframe): ", message.data);
                    network.selectNodes([message.data], { highlightEdges: false });
                    // network.focus( [message.data], {scale:1, animation: { duration: 1000, easingFunction: "easeInOutQuad" }});
                    // network.fit({ nodes: [message.data], animation: { duration: 1000, easingFunction: "easeInOutQuad" } });
                    break;
                case 'highlightEdgeOnGraph':
                    // console.log("Edge to highlight: ", message.data);
                    // network.unselectAll();
                    // console.log("Edge ID (iframe): ", message.data);
                    network.selectEdges([message.data]);
                    // var nodeFrom = edges.get(message.data).from;
                    // var nodeTo = edges.get(message.data).to;
                    // console.log("from-to positions:", network.getPositions( [nodeFrom, nodeTo]));
                    // network.fit({ animation: { duration: 1000, easingFunction: "easeInOutQuad" } });
                    break;
            }
        }
    });
}());
