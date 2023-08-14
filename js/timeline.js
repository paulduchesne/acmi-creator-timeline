
// send SPARQL query to Wikidata.

async function send_sparql_query(q) {

    let sparql_request = d3.json(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`,
    { headers: { accept: "application/sparql-results+json" } }
    );

    return sparql_request;
}

// life tick is birth and death events.

async function life_tick(placement, event, my_scale) {

    d3.select("#canvas")
        .append("rect")
        .attr("class", "life_line")
        .attr("x", my_scale(placement))
        .attr("y", 100-40)
        .attr("width", "1")
        .attr("height", "40")
        
    d3.select("#canvas")
        .append("text")
        .attr('class', 'life_text')
        .attr("x", my_scale(placement))
        .attr("y", 100-45)
        .text(event+" ("+(placement.getYear()+1900)+")")
}

// render timeline.

async function render_timeline(wikidata_id) {
    
    // SPARQL query to populate timeline.

    let query = `   
        select ?dob ?dod ?work ?workLabel ?qid (sample(?acmi_link) as ?acmi_link) (count(distinct ?claim) as ?claim_count) ((min(?publication)) as ?earliestPublication)  where {
            values ?creator {wd:`+wikidata_id+`}
            values ?role {wdt:P161 wdt:P57}
            ?creator wdt:P569 ?dob .
            optional { ?creator wdt:P570 ?dod } .
            optional { 
                ?work ?role ?creator .
                ?work ?p ?claim .
                ?work wdt:P577 ?publication .
                ?work wdt:P7003 ?acmi_link . 
            } .  
            bind(strafter(str(?work), str(wd:)) AS ?qid) .
            service wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
        group by ?dob ?dod ?work ?workLabel ?earliestPublication  ?qid
        order by desc(?claim_count)
        limit 4 ` 

    let data = await send_sparql_query(query)
    data = data.results.bindings
    console.log('data', data)

    // SVG canvas to draw timeline.
    
    d3.select("#paper")
        .append("svg")
        .attr("id", "canvas")
        .attr("width", "800")
        .attr("height", "150")
        .style("background-color", 'black');

    // only allow response if response is populated.

    if (data.length) {
        let deceased = false
        let timeline_start = data[0].dob.value
        let timeline_end = new Date().toISOString()

        // distinguish instances where creator is no longer living.

        if (data[0].dod) {    
            deceased = true
            timeline_end = data[0].dod.value
        } 

        // draw timeline axis based on provided date range.
 
        let scale = d3.scaleTime().domain([new Date(timeline_start), new Date(timeline_end)]).range([50, 750])
        let axis = d3.axisBottom(scale).ticks(10)
        d3.select('#canvas').append('g').call(axis).attr("transform", `translate(0, 100)`).attr("class", "timeAxis")

        // draw life ticks.

        life_tick(new Date(timeline_start), 'birth', scale)
        if (deceased) {
            life_tick(new Date(timeline_end), 'death', scale)
        }

        // draw work stalks.
        
        d3.select("#canvas")
            .selectAll(".work_stalks")
            .data(data)
            .join("rect")
            .attr('class', 'work_stalks')
            .attr("x", d => scale(new Date(d.earliestPublication.value)))
            .attr("y", 100-40)
            .attr("width", "1")
            .attr("height", "40")
            .style("fill", 'magenta')
            
        d3.select("#canvas")
            .selectAll(".work_head")
            .data(data)
            .join("rect")
            .attr('class', 'work_head')
            .attr('id', d => d.acmi_link.value)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("x", d => scale(new Date(d.earliestPublication.value)))
            .attr("y", 100-40)
            .attr("width", "10")
            .attr("height", "10")
            .style("fill", 'magenta')
            .on('mouseover', function(k, d) {

                // mouseover, mute the rest of the graphic.
                
                d3.selectAll('.timeAxis,.life_text,.life_line,.work_head,.work_stalks')
                    .transition().duration(500).style('opacity', '0.2')
                
                d3.select(this).transition().duration(500).style("fill", 'white').style('opacity', '1')
                d3.select('#'+d.qid.value).transition().duration(500).style('opacity', '1')
            })
            .on('mouseout',function(k, d) {

                // mouseout, resume initial state
                
                d3.selectAll('.timeAxis,.work_stalks,.life_text,.life_line')
                    .transition().duration(500).style('opacity', '1')
                    
                d3.selectAll('.work_head').transition().duration(500).style('opacity', '1').style('fill', 'magenta')
                d3.selectAll('.work_label').transition().duration(500).style('opacity', '0')
            })
            .on('click', function(k, d) {
            
                // mouseclick out to ACMI page.
                
                window.open("https://acmi.net.au/"+d.acmi_link.value,"_self"); 
            })
            
        d3.select("#canvas")
            .selectAll(".work_label")
            .data(data)
            .join("text")
            .attr('class', 'work_label')
            .attr('id', d => d.qid.value)
            .attr("x", d => scale(new Date(d.earliestPublication.value))+12)
            .attr("y", 100-40+9 )
            .text(d => d.workLabel.value+' ('+((new Date(d.earliestPublication.value)).getYear()+1900)+')')
        } 
    }

// some examples

// Jacki Weaver - Q241897
// Agnès Varda - Q229990
// Hans-Gunther Herbetz - Q121337020

render_timeline('Q241897')
