(function () {
    const vscode = acquireVsCodeApi();

    //#region UTILS
    // kudos to beloved jquery
    var $ = function (id) { return document.getElementById(id); };
    //#endregion UTILS

    //#region WINBOX
    var winbox = new WinBox({
        title: "Edit", x: "400px", y: "10px",class: ["no-full", "no-resize"]
    });
    winbox.body.innerHTML = /*html*/`
        <div id="nodes" class="">
            <label class="label">Nodes</label><br>
            <input class="input" type="text" id="state_label" value="State"><br>
            <input class="input" type="color" id="state_color" value="#ffffff"><br>
        </div>
        <div id="edges" class=""></div>
        `;
    winbox
        // .hide()
        .setBackground("#4e92edbf")
        .removeControl("wb-max")
        .removeControl("wb-full")
        .removeControl("wb-close")
        .resize("300px", "200px")


    //#endregion WINBOX

    //#region Keyboard shortcuts
    function winboxToogle() {
        winbox.hidden ?
            winbox.show() :
            winbox.hide()
    }
    function minimapToogle() {
        $('minimapWrapper').classList.contains("hidden") ?
            $('minimapWrapper').classList.remove("hidden") :
            $('minimapWrapper').classList.add("hidden")
    }
    document.addEventListener("keydown", function (e) {
        var ctrl = (e.ctrlKey)
        var alt = (e.altKey)
        if (e.key === 's' && ctrl) { e.preventDefault();/* console.log('ctlr+s'); */ }
        else if (e.key === 'j' && ctrl) { e.preventDefault();/* console.log('ctlr+j'); */winboxToogle() }
        else if (e.key === 'k' && ctrl) { e.preventDefault();/* console.log('ctlr+k'); */ }
        else if (e.key === 'l' && ctrl) { e.preventDefault();/* console.log('ctlr+l'); */ network.fit({animation: {duration: 1000,easingFunction: "easeInOutQuad"}}) }
        else if (e.key === 'l' && alt) { e.preventDefault();/* console.log('ctlr+l'); */ addEdge() }
        else if (e.key === 'm' && ctrl) { e.preventDefault();/* console.log('ctlr+m'); */ minimapToogle() }
        else if (e.key === 'o' && ctrl) { e.preventDefault(); winboxToogle(); }
        else if (e.key === 'i' && ctrl) { e.preventDefault(); console.log(Math.max(...nodes.getIds())) }
        else if (e.key === 'u' && ctrl) { e.preventDefault();/* console.log('ctlr+u'); */ $('minimapWrapper').classList.remove("hidden"); }
        else if (e.key === 'z' && ctrl) { e.preventDefault();/* console.log('ctlr+z'); */ $('minimapWrapper').classList.add("hidden"); }
        else if (e.key === 'f' && ctrl) { e.preventDefault();/* console.log('ctlr+f'); */ focusNode(); }
    }, false);
    //#endregion Keyboard shortcuts

    //#region Data
    const nodes = new vis.DataSet([
        { id: 1, label: 'Node 1', x: '29', y: '-87' },
        { id: 2, label: 'Node 2', x: '-121', y: '127' },
        { id: 3, label: 'Node 3', x: '290', y: '124' },
        { id: 4, label: 'Node 4', x: '-271', y: '-54' },
        { id: 5, label: 'Node 5', x: '363', y: '-78' },
    ]);
    // node_ids = nodes.getIds();
    const edges = new vis.DataSet([
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 3 },
        { from: 2, to: 4 },
        { from: 3, to: 5 }
    ]);
    // edge_ids = edges.getIds()
    //#endregion Data

    //#region Network options
    const options = {
        nodes: {
            shape: 'box',
            size: 30,
            font: {
                size: 32,
                color: '#333'
            },
            borderWidth: 1
        },
        edges: {
            "smooth": {
                "type": "curvedCCW",
                "forceDirection": "none",
                "roundness": 0.1
            },
            arrows: {
                to: {
                    enabled: true,
                    // imageHeight: undefined,
                    // imageWidth: undefined,
                    scaleFactor: 1,
                    // src: undefined,
                    type: "arrow"
                },
            },
        },
        physics: { enabled: false },
        layout: { randomSeed: 2 },
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
    //#endregion Create network

    //#region MINIMAP
    const ratio = 5; // Ratio is difference between original VisJS Network and Minimap.
    // Draw minimap wrapper
    const drawMinimapWrapper = () => {
        const {
            clientWidth,
            clientHeight
        } = network.body.container;
        const minimapWrapper = document.getElementById('minimapWrapper');
        const width = Math.round(clientWidth / ratio);
        const height = Math.round(clientHeight / ratio);
        minimapWrapper.style.width = `${width}px`;
        minimapWrapper.style.height = `${height}px`;
    }
    // Draw minimap Image
    const drawMinimapImage = () => {
        const originalCanvas = document.getElementsByTagName('canvas')[0]
        const minimapImage = document.getElementById('minimapImage')
        const {
            clientWidth,
            clientHeight
        } = network.body.container
        const tempCanvas = document.createElement('canvas')
        const tempContext = tempCanvas.getContext('2d')
        const width = Math.round((tempCanvas.width = clientWidth / ratio))
        const height = Math.round((tempCanvas.height = clientHeight / ratio))
        if (tempContext) {
            tempContext.drawImage(originalCanvas, 0, 0, width, height)
            minimapImage.src = tempCanvas.toDataURL()
            minimapImage.width = width
            minimapImage.height = height
        }
    }
    // Draw minimap Radar
    const drawRadar = () => {
        const {
            clientWidth,
            clientHeight
        } = network.body.container
        const minimapRadar = document.getElementById('minimapRadar')
        const {
            targetScale
        } = network.view
        const scale = network.getScale()
        const translate = network.getViewPosition()
        minimapRadar.style.transform = `translate(${(translate.x / ratio) *
            targetScale}px, ${(translate.y / ratio) * targetScale}px) scale(${targetScale / scale})`
        minimapRadar.style.width = `${clientWidth / ratio}px`
        minimapRadar.style.height = `${clientHeight / ratio}px`
    }
    network.on('afterDrawing', () => {
        const {
            clientWidth,
            clientHeight
        } = network.body.container;
        const width = Math.round(clientWidth / ratio);
        const height = Math.round(clientHeight / ratio);
        const minimapImage = document.getElementById('minimapImage');
        const minimapWrapper = document.getElementById('minimapWrapper');
        // Initial render
        if (!minimapImage.hasAttribute('src') || minimapImage.src === '') {
            if (!minimapWrapper.style.width || !minimapWrapper.style.height) {
                drawMinimapWrapper();
            }
            drawMinimapImage();
            drawRadar();
        } else if (
            minimapWrapper.style.width !== `${width}px` ||
            minimapWrapper.style.height !== `${height}px`
        ) {
            minimapImage.removeAttribute('src');
            drawMinimapWrapper();
            network.fit();
        } else {
            drawRadar();
        }
    })
    //#endregion  MINIMAP

    //#region Events
    network.on('resize', () => {
        // this will probablyy go out with vscode extension
        network.fit();
    })

    network.on('dragStart', () => {
        const minimapWrapper = document.getElementById('minimapWrapper');
        minimapWrapper.classList.remove('minimapWrapperIdle');
        minimapWrapper.classList.add('minimapWrapperMove');
    })

    network.on('dragEnd', () => {
        if (hover) {
            drawMinimapImage();
        }
        const minimapWrapper = document.getElementById('minimapWrapper');
        minimapWrapper.classList.remove('minimapWrapperMove');
        minimapWrapper.classList.add('minimapWrapperIdle')
        // console.log("dragend")
    })

    network.on('zoom', () => {
        const minimapWrapper = document.getElementById('minimapWrapper');
        minimapWrapper.classList.remove('minimapWrapperIdle');
        minimapWrapper.classList.add('minimapWrapperMove')
    })
    network.addEventListener("click", function (e) {
        if (e.event.srcEvent.altKey) {
            addNode(e.pointer.canvas.x, e.pointer.canvas.y)
            drawMinimapImage();
        }
    })

    var selectedNodes;
    var selectedNodesObj;
    network.addEventListener('selectNode', function () {
        selectedNodes = network.getSelectedNodes()
        console.log("nodes", selectedNodes)
        console.log("nodes+", nodes.get(selectedNodes))
        console.log("positions: ", network.getPositions())
    })

    var selectedEdges;
    var selectedEdgesObj;
    network.addEventListener('selectEdge', function () {
        // console.log("select edge")
        selectedEdges = network.getSelectedEdges()
        console.log("edges", selectedEdges)
        console.log("edges+", edges.get(selectedEdges))
    })

    var hover = false;
    network.addEventListener('hoverNode', function (params) {
        hover = true;
        console.log("hover", params.node)
        // $("wb_title").innerHTML = params.node

    })
    network.addEventListener('blurNode', function (params) {
        hover = false;
        console.log("blur", params.node)
    })
    //#endregion Events

    //#region Node utils

    function focusNode() {
        if (selectedNodes) {
            var options = {animation: {duration: 1000,easingFunction: "easeInOutQuad"}};
            var node = selectedNodes[0]
            console.log("selected nodes [0]:", selectedNodes[0])
            console.log("focus")
            network.focus(node,options)
        }
    }

    function addEdge(from, to) {
        if (selectedNodes.length == 2) {
            edges.update([{ from: selectedNodes[0], to: selectedNodes[1] }])
        }
    }
    function addNode(x, y) {
        var newId = Math.max(...nodes.getIds()) + 1;
        nodes.update([{ id: newId, label: 'New Node', x: x, y: y }]);
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
            case 'refactor':
                // e ovdje bi negdje mogao čitati podatke
                console.log("refactor")
                break;
        }
    });
}());
