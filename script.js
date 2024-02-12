const filePath = "faker.json";
let game2;

// Define the fetchData function
async function fetchData() {
  try {
    const response = await fetch(filePath);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

(async () => {
  // Call the fetchData function
  const game2 = await fetchData();
  const modifiedGame2Info =
    game2?.info?.frames?.map((item) => ({
      events: item.events.filter((event) => event.type === "CHAMPION_KILL"),
      participantFrames: item.participantFrames,
      timestamp: item.timestamp,
    })) || [];
  let flattenedEvents2 = modifiedGame2Info.flatMap((item) => item.events);
  let listChamp = getChampName(flattenedEvents2);
  generateTeamHTML(listChamp, "teams-container");
  console.log(listChamp);
  // Plot creation
  const margin = { top: 20, right: 20, bottom: 80, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const x = d3
    .scaleLinear()
    .domain([0, 16000])
    .range([margin.left, width + margin.left]);
  const y = d3
    .scaleLinear()
    .domain([0, 15500])
    .range([height + margin.top, margin.top]);

  const svg = d3
    .select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("width", "auto%")
    .style("height", "auto");

  svg
    .append("image")
    .attr("xlink:href", "map.png")
    .attr("width", 500)
    .attr("height", 500)
    .attr("x", margin.left)
    .attr("y", margin.top);

  // Add x-axis
  const xAxis = svg
    .append("g")
    .attr("transform", `translate(0,${height + margin.top})`)
    .call(d3.axisBottom(x));

  // Add y-axis
  const yAxis = svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Hide both axes
  xAxis.select("path").style("display", "none");
  xAxis.selectAll("line").style("display", "none");
  yAxis.select("path").style("display", "none");
  yAxis.selectAll("line").style("display", "none");
  xAxis.selectAll("text").style("display", "none");
  yAxis.selectAll("text").style("display", "none");

  const slider = d3
    .sliderHorizontal()
    .min(d3.min(flattenedEvents2, (d) => d.timestamp))
    .max(d3.max(flattenedEvents2, (d) => d.timestamp))
    .step(1)
    .width(width)
    .on("onchange", (val) => updateGraph(val));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${height + margin.top + 10})`)
    .call(slider);

  const tooltip = d3
    .select("#my_dataviz")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "rgba(255, 255, 255, 0.8)")
    .style("padding", "8px")
    .style("border-radius", "4px");

  // Other parts of your existing code...

  // Function to update the graph
  function updateGraph(selectedTime) {
    const filteredData = flattenedEvents2.filter(
      (event) => event.timestamp <= selectedTime
    );

    svg.selectAll("circle").remove(); // Clear existing circles

    // Add new circles with hover interaction
    // Les points représente l'équipe qui a fait le kill
    svg
      .selectAll("circle")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.position.x))
      .attr("cy", (d) => y(d.position.y))
      .attr("r", 5)
      .attr("fill", (d) =>
        d.killerId >= 1 && d.killerId <= 5 ? "red" : "blue"
      )
      .on("mouseover", (event, d) => {
        console.log(event);
        // getAssist(event);
        const killerImgSrc = getChampionImageSrc(
          `${listChamp.get(`${event.killerId}`)}`
        );
        const victimImgSrc = getChampionImageSrc(
          `${listChamp.get(`${event.victimId}`)}`
        );

        let killHtml =
          `<div class="kill-container">` +
          `<img src="${killerImgSrc}"  width="80" height="80" />` +
          ` <img src="kill.png"  width="50" height="50" /> ` +
          `<img src="${victimImgSrc}" width="80" height="80" />` +
          `</div>`;

        // Loop through assistingParticipantIds and add assistant images
        if (event.assistingParticipantIds) {
          killHtml += `<div>`;
          for (let i = 0; i < event.assistingParticipantIds.length; i++) {
            let assistantImgSrc = getChampionImageSrc(
              listChamp.get(`${event.assistingParticipantIds[i]}`)
            ); // Replace this with the actual function to get assistant image source
            killHtml += `<img src="${assistantImgSrc}" width="50" height="50" style="margin-top: 10px;  margin-right: 5px;" />`;
          }
          killHtml += `</div>`;
        }

        tooltip
          .style("visibility", "visible")
          .html(killHtml)
          .style("left", event.pageX + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });
  }

  // Initial plot
  updateGraph(0);
})();

function getChampionImageSrc(championName) {
  const imageSrc = `img/${championName}.png`;
  return imageSrc;
}

let myMap = new Map();
function getChampName(data) {
  data.forEach((event) => {
    let killerId = event.killerId;
    let killerEntry = event.victimDamageReceived.find(
      (entry) => entry.participantId === killerId
    );
    myMap.set(`${killerId}`, `${killerEntry.name}`);
    let victimId = event.victimId;
    let victimName = "";
    if (event.victimDamageDealt) {
      victimName = event.victimDamageDealt[0].name;
      myMap.set(`${victimId}`, `${victimName}`);
    }
  });
  return myMap;
}

function generateTeamHTML(championMap, targetContainerClass) {
  let targetContainer = document.querySelector(`.${targetContainerClass}`);
  console.log(targetContainer);
  let teamRed = [];
  let teamBlue = [];

  championMap.forEach((champion, key) => {
    let championImgSrc = getChampionImageSrc(champion); // Replace with your actual function
    if (parseInt(key) >= 1 && parseInt(key) <= 5) {
      teamRed.push(
        `<img src="${championImgSrc}" alt="${champion}" width="50" height="50" style="margin-right: 5px;" />`
      );
    } else if (parseInt(key) >= 6 && parseInt(key) <= 10) {
      teamBlue.push(
        `<img src="${championImgSrc}" alt="${champion}" width="50" height="50" style="margin-right: 5px;" />`
      );
    }
  });

  // Add HTML to targetContainer
  targetContainer.innerHTML = `
    <div>
      <h2>Red Team</h2>
      ${teamRed.join("")}
    </div>
    <div>
      <h2>Blue Team</h2>
      ${teamBlue.join("")}
    </div>
  `;
}
