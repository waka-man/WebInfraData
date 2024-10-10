document.addEventListener("DOMContentLoaded", () => {
    loadInteractionData();
});

async function loadInteractionData() {
    try {
        const response = await fetch('output.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        if (!data) {
            throw new Error("No data found in output.json");
        }

        renderNavLinks(data);
        renderPageData(data);
    } catch (error) {
        console.error("Could not load interaction data:", error);
    }
}

// Renders navigation links based on JSON data
function renderNavLinks(data) {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) {
        console.error("Navigation container not found");
        return;
    }

    const links = [];

    // Link for aggregate data
    links.push(`<a href="?page=aggregate">Aggregate Data</a>`);

    // Links for each date
    if (data.by_date) {
        for (const date in data.by_date) {
            links.push(`<a href="?page=${encodeURIComponent(date)}">${date}</a>`);
        }
    }

    // Link for special students
    links.push(`<a href="?page=special_students">Special Students</a>`);

    navLinks.innerHTML = links.join(" | ");
}

// Renders the data for the current page
function renderPageData(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page") || "aggregate";

    let interactionCounts, participationOverTime, nonParticipants, totalParticipants, totalNonParticipants;

    if (page === "special_students") {
        document.getElementById("page-title").innerText = "Special Students Data";
        displaySpecialStudentsTable(data.special_students);
        drawSpecialStudentsCharts(data.special_students);
        return;
    } else{
    if (page === "aggregate") {
        document.getElementById("page-title").innerText = "Aggregate Data";
        interactionCounts = data.aggregate ? data.aggregate.interaction_counts : {};
        participationOverTime = data.aggregate ? data.aggregate.participation_over_time : {};
        nonParticipants = data.aggregate ? data.aggregate.non_participants : [];
        totalParticipants = data.aggregate ? data.aggregate.total_participants : 0;
        totalNonParticipants = data.aggregate ? data.aggregate.total_non_participants : 0;

        displayInteractionTable(interactionCounts, nonParticipants);
        drawCharts(interactionCounts, nonParticipants, participationOverTime, totalParticipants, totalNonParticipants);

    } else if (data.by_date && data.by_date[page]) {
        document.getElementById("page-title").innerText = `Data for ${page}`;
        interactionCounts = data.by_date[page].interaction_counts || {};
        participationOverTime = data.by_date[page].participation_over_time || {};
        nonParticipants = data.by_date[page].non_participants || [];
        totalParticipants = data.by_date[page].total_participants || 0;
        totalNonParticipants = data.by_date[page].total_non_participants || 0;

        displayInteractionTable(interactionCounts, nonParticipants);
        drawCharts(interactionCounts, nonParticipants, participationOverTime, totalParticipants, totalNonParticipants);

    } else if (page === "special_students") {
        document.getElementById("page-title").innerText = "Special Students Data";
        displaySpecialStudentsTable(data.special_students);
        drawSpecialStudentsCharts(data.special_students);

    } else {
        document.getElementById("page-title").innerText = "Page Not Found";
        return;
    }
}
}

// Renders the interaction table and non-participants list
function displayInteractionTable(interactionCounts, nonParticipants) {
    const tableContainer = document.getElementById('interaction-table');
    if (!tableContainer) {
        console.error("Interaction table container not found");
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Attendee</th>
                <th>Interaction Count</th>
            </tr>
        </thead>
        <tbody>`;

    // Convert interactionCounts object to an array and sort it by interaction count in descending order
    const sortedInteractions = Object.entries(interactionCounts)
        .filter(([attendee, count]) => count > 0) // Only include attendees with more than 0 interactions
        .sort((a, b) => b[1] - a[1]); // Sort by interaction count in descending order

    // Generate table rows for sorted interactions
    for (let [attendee, count] of sortedInteractions) {
        html += `<tr>
            <td>${attendee}</td>
            <td>${count}</td>
        </tr>`;
    }
    html += `</tbody></table>`;

    tableContainer.innerHTML = html;

    // Display the list of non-participants
    const nonParticipantsList = document.getElementById('nonParticipantsList');
    if (!nonParticipantsList) {
        console.error("Non-participants list container not found");
        return;
    }

    let nonParticipantsHtml = '';
    for (let attendee of nonParticipants) {
        nonParticipantsHtml += `<li>${attendee}</li>`;
    }
    nonParticipantsList.innerHTML = nonParticipantsHtml;
}

// Displays a table of special students and their participation
function displaySpecialStudentsTable(specialStudents) {
    const tableContainer = document.getElementById('interaction-table');
    if (!tableContainer) {
        console.error("Interaction table container not found");
        return;
    }

    // Sort the special students by the total number of interactions
    const sortedSpecialStudents = Object.entries(specialStudents).sort((a, b) => {
        const totalInteractionsA = Object.values(a[1]).reduce((acc, val) => acc + val, 0);
        const totalInteractionsB = Object.values(b[1]).reduce((acc, val) => acc + val, 0);
        return totalInteractionsB - totalInteractionsA;
    });

    let html = `<table>
        <thead>
            <tr>
                <th>Special Student</th>
                <th>Sessions Attended</th>
                <th>Total Interactions</th>
            </tr>
        </thead>
        <tbody>`;

    for (let [student, sessions] of sortedSpecialStudents) {
        const sessionsAttended = Object.keys(sessions).length;
        const totalInteractions = Object.values(sessions).reduce((acc, val) => acc + val, 0);

        html += `<tr>
            <td>${student}</td>
            <td>${sessionsAttended}</td>
            <td>${totalInteractions}</td>
        </tr>`;
    }

    html += `</tbody></table>`;

    tableContainer.innerHTML = html;
}

function drawSpecialStudentsCharts(specialStudents) {
    // Clear the existing charts
    if (window.specialInteractionChart && typeof window.specialInteractionChart.destroy === "function") {
        window.specialInteractionChart.destroy();
    }
    if (window.specialSessionsChart && typeof window.specialSessionsChart.destroy === "function") {
        window.specialSessionsChart.destroy();
    }

    // Total Interactions Chart
    const specialInteractionChartCtx = document.getElementById('interactionChart')?.getContext('2d');
    if (specialInteractionChartCtx) {
        const labels = Object.keys(specialStudents);
        const totalInteractions = labels.map(student => 
            Object.values(specialStudents[student]).reduce((sum, count) => sum + count, 0)
        );

        window.specialInteractionChart = new Chart(specialInteractionChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Interactions',
                    data: totalInteractions,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        console.error("Interaction chart context for special students not found.");
    }

    // Sessions Attended Chart
    const specialSessionsChartCtx = document.getElementById('participationOverTimeChart')?.getContext('2d');
    if (specialSessionsChartCtx) {
        const sessionsAttended = labels.map(student => Object.keys(specialStudents[student]).length);

        window.specialSessionsChart = new Chart(specialSessionsChartCtx, {
            type: 'horizontalBar', // Makes it a horizontal bar chart
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sessions Attended',
                    data: sessionsAttended,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    } else {
        console.error("Sessions attended chart context for special students not found.");
    }
}

// Draws the charts for interaction counts, participation, and over time
function drawCharts(interactionCounts, nonParticipants, participationOverTime, totalParticipants, totalNonParticipants) {
    // Safely destroy existing charts if they exist
    if (window.interactionChart && typeof window.interactionChart.destroy === "function") {
        window.interactionChart.destroy();
    }
    if (window.participationChart && typeof window.participationChart.destroy === "function") {
        window.participationChart.destroy();
    }
    if (window.horizontalInteractionChart && typeof window.horizontalInteractionChart.destroy === "function") {
        window.horizontalInteractionChart.destroy();
    }
    if (window.participationOverTimeChart && typeof window.participationOverTimeChart.destroy === "function") {
        window.participationOverTimeChart.destroy();
    }

    // Bar Chart for Interaction Counts
    const interactionChartCtx = document.getElementById('interactionChart')?.getContext('2d');
    if (interactionChartCtx) {
        window.interactionChart = new Chart(interactionChartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(interactionCounts),
                datasets: [{
                    label: 'Number of Interactions',
                    data: Object.values(interactionCounts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Pie Chart for Participation
    const participationChartCtx = document.getElementById('participationChart')?.getContext('2d');
    if (participationChartCtx) {
        window.participationChart = new Chart(participationChartCtx, {
            type: 'pie',
            data: {
                labels: ['Participants', 'Non-Participants'],
                datasets: [{
                    data: [totalParticipants, totalNonParticipants],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    } else {
        console.error("Pie chart context not found.");
    }

    // Horizontal Bar Chart for Interaction Counts
    const horizontalInteractionChartCtx = document.getElementById('horizontalInteractionChart')?.getContext('2d');
    if (horizontalInteractionChartCtx) {
        window.horizontalInteractionChart = new Chart(horizontalInteractionChartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(interactionCounts),
                datasets: [{
                    label: 'Number of Interactions',
                    data: Object.values(interactionCounts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Makes it a horizontal bar chart
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Line Chart for Participation Over Time
    const participationOverTimeChartCtx = document.getElementById('participationOverTimeChart')?.getContext('2d');
    if (participationOverTimeChartCtx) {
        window.participationOverTimeChart = new Chart(participationOverTimeChartCtx, {
            type: 'line',
            data: {
                labels: Object.keys(participationOverTime),
                datasets: [{
                    label: 'Number of Participants',
                    data: Object.values(participationOverTime),
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Draws charts specifically for special students
function drawSpecialStudentsChart(specialStudents) {
    const ctx = document.getElementById('specialStudentsChart')?.getContext('2d');
    if (!ctx) {
        console.error("Special students chart container not found");
        return;
    }

    // Prepare data for the chart
    const labels = Object.keys(specialStudents);
    const totalInteractions = labels.map(student => {
        return Object.values(specialStudents[student]).reduce((acc, val) => acc + val, 0);
    });

    // Create the chart
    window.specialStudentsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Interactions',
                data: totalInteractions,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}