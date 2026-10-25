(async function () {
  "use strict";

  const container = document.getElementById("knowledge-graph");
  const search = document.getElementById("graph-search");
  const category = document.getElementById("graph-category");
  const reset = document.getElementById("graph-reset");
  const status = document.getElementById("graph-status");

  if (!container) return;

  if (typeof cytoscape === "undefined") {
    status.textContent = "Erro: biblioteca Cytoscape.js indisponível.";
    return;
  }

  try {
    const response = await fetch("../assets/knowledge-graph.json");

    if (!response.ok) {
      throw new Error("Não foi possível carregar os dados do grafo.");
    }

    const data = await response.json();

    const nodes = data.nodes.map(node => ({
      data: {
        id: node.id,
        label: node.label,
        category: node.category,
        url: node.url
      }
    }));

    const edges = data.edges.map((edge, index) => ({
      data: {
        id: "edge-" + index,
        source: edge.source,
        target: edge.target
      }
    }));

    const categories = [...new Set(
      data.nodes.map(node => node.category)
    )].sort();

    categories.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      category.appendChild(option);
    });

    const cy = cytoscape({
      container,
      elements: [...nodes, ...edges],
      layout: {
        name: "cose",
        animate: false,
        nodeRepulsion: 1200000,
        idealEdgeLength: 190,
        nodeOverlap: 30,
        gravity: 0.15,
        padding: 55
      },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#2874a6",
            "label": "data(label)",
            "font-size": 10,
            "color": "#243447",
            "text-wrap": "wrap",
            "text-max-width": 110,
            "text-valign": "bottom",
            "text-margin-y": 7,
            "width": 23,
            "height": 23
          }
        },
        {
          selector: "edge",
          style: {
            "width": 1,
            "line-color": "#aab7c4",
            "opacity": 0.45,
            "curve-style": "bezier"
          }
        },
        {
          selector: "edge",
          style: {
            "width": 1,
            "line-color": "#aab7c4",
            "opacity": 0.10,
            "curve-style": "bezier"
          }
        },
        {
          selector: ".focused-edge",
          style: {
            "width": 2.5,
            "line-color": "#d35400",
            "opacity": 0.95
          }
        },
        {
          selector: ".focused-node",
          style: {
            "background-color": "#d35400",
            "width": 30,
            "height": 30
          }
        },
        {
          selector: ".highlight",
          style: {
            "background-color": "#d35400",
            "width": 35,
            "height": 35,
            "font-weight": "bold",
            "font-size": 13
          }
        }
      ]
    });

    // Enquadra todos os nós após a conclusão do layout.
    cy.one("layoutstop", () => {
      cy.resize();
      cy.fit(cy.elements(), 85);
    });

    function applyFilters() {
      const term = search.value.trim().toLocaleLowerCase("pt-BR");
      const selected = category.value;

      cy.elements().removeClass("highlight");

      const matching = cy.nodes().filter(node => {
        const text = node.data("label").toLocaleLowerCase("pt-BR");
        return (!term || text.includes(term)) &&
               (!selected || node.data("category") === selected);
      });

      cy.nodes().style("display", "none");
      cy.edges().style("display", "none");

      matching.style("display", "element");

      cy.edges().filter(edge =>
        matching.contains(edge.source()) &&
        matching.contains(edge.target())
      ).style("display", "element");

      if (term) matching.addClass("highlight");

      status.textContent =
        matching.length + " nós visíveis de " + data.nodes.length +
        " — " + data.edges.length + " relações no acervo.";

      cy.fit(matching.length ? matching : cy.elements(), 35);
    }

    search.addEventListener("input", applyFilters);
    category.addEventListener("change", applyFilters);

    reset.addEventListener("click", () => {
      search.value = "";
      category.value = "";
      applyFilters();
    });

    let previousTap = { id: null, time: 0 };

    function focusNode(node) {
      cy.elements().removeClass("focused-edge focused-node");

      const connectedEdges = node.connectedEdges().filter(
        edge => edge.style("display") !== "none"
      );

      connectedEdges.addClass("focused-edge");
      node.addClass("focused-node");
      connectedEdges.connectedNodes().addClass("focused-node");

      status.textContent =
        node.data("label") + " — " +
        connectedEdges.length + " relações diretas.";
    }

    cy.on("tap", "node", event => {
      focusNode(event.target);

      const node = event.target;
      const now = Date.now();

      if (previousTap.id === node.id() &&
          now - previousTap.time < 450) {
        const target = node.data("url");
        const base = new URL("../", window.location.href);
        const destination = new URL(target, base);
        window.location.assign(destination.href);
      }

      previousTap = { id: node.id(), time: now };
    });

    status.textContent =
      data.nodes.length + " nós e " +
      data.edges.length + " relações carregados.";

  } catch (error) {
    status.textContent = "Erro ao carregar o grafo: " + error.message;
  }
})();
