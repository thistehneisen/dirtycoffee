var employeeNameInput = document.getElementById("employeeName");

document.getElementById("add").addEventListener("click", addEmployee);
employeeNameInput.addEventListener("keypress", function(e) {
    if (e.keyCode === 13) {
        addEmployee();
    }
});

function addEmployee() {
    var name = employeeNameInput.value;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/employees", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            //alert(JSON.parse(this.responseText).message);
            loadEmployees();
            employeeNameInput.value = '';
        }
    }
    xhr.send("name=" + encodeURIComponent(name));
};

function loadEmployees() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/employees", true);
    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var employees = JSON.parse(this.responseText);
            var tbody = document.getElementById("employeeTable").getElementsByTagName("tbody")[0];
            tbody.innerHTML = "";

            for (var i = 0; i < employees.length; i++) {
                var row = tbody.insertRow();
                row.id = "row-" + employees[i].name;

                var lastClean = (employees[i].cleans.length > 0 && employees[i].cleans[employees[i].cleans.length - 1].clean_time) || 'N/A';
                var lastDrink = (employees[i].drinks.length > 0 && employees[i].drinks[employees[i].drinks.length - 1].drink_time) || 'N/A';

                var now = new Date();
                var lastCleanDate = new Date(lastClean);
                var lastDrinkDate = new Date(lastDrink);

                var timeSinceLastClean = Math.abs(now - lastCleanDate) / 36e5; // Difference in hours
                var timeSinceLastDrink = Math.abs(now - lastDrinkDate) / 6e4; // Difference in minutes

                if (timeSinceLastClean > 1460) { // 2 months
                    row.classList.add('table-danger');
                } else if (timeSinceLastClean > 120) { // 5 days
                    row.classList.add('table-warning');
                }

                var nameCell = row.insertCell(0);
                nameCell.innerHTML = employees[i].name;

                (function(employee) {
                    nameCell.addEventListener("click", function() {
                        var habitsData = generateIndividualHabitsData(employee);
                        createIndividualHabitsChart(habitsData);
                    });
                    nameCell.style.cursor = "pointer"; // change the cursor to indicate clickability
                })(employees[i]);

                if (lastClean === 'N/A') {
                    timeAgo = lastClean;
                } else {
                    var lastCleanTime = moment(lastClean);
                    var timeAgo = lastCleanTime.fromNow();
                }
                row.insertCell(1).innerHTML = timeAgo;
                row.insertCell(2).innerHTML = (employees[i].cleans && employees[i].cleans.length) || '0';

                // Add total drinks after total cleans
                var totalDrinks = (employees[i].drinks && employees[i].drinks.length) || '0';
                row.insertCell(3).innerHTML = totalDrinks;

                var drinkButton = document.createElement('button');
                drinkButton.type = "button";
                drinkButton.className = "btn btn-primary";
                drinkButton.innerHTML = "Drink";
                if (timeSinceLastDrink < 5) {
                    var remainingTime = Math.ceil((5 - timeSinceLastDrink) * 60); // Calculate remaining time in seconds
                    drinkButton.disabled = true;
                    drinkButton.setAttribute('data-bs-toggle', 'tooltip');
                    drinkButton.setAttribute('data-bs-placement', 'top');
                    drinkButton.setAttribute('title', moment.duration(remainingTime, 'seconds').humanize() + ' remaining');
                    new bootstrap.Tooltip(drinkButton);
                }
                (function(name) {
                    drinkButton.addEventListener("click", function() {
                        drinkCoffee(name);
                    });
                })(employees[i].name);

                var cleanButton = document.createElement('button');
                cleanButton.type = "button";
                cleanButton.className = "btn btn-success";
                cleanButton.innerHTML = "Clean";
                if (timeSinceLastClean < 1) {
                    var remainingTimeInSeconds = Math.ceil((1 - timeSinceLastClean) * 3600); // Calculate remaining time in seconds
                    cleanButton.disabled = true;
                    cleanButton.setAttribute('data-bs-toggle', 'tooltip');
                    cleanButton.setAttribute('data-bs-placement', 'top');

                    var remainingDuration = moment.duration(remainingTimeInSeconds, 'seconds');
                    var remainingHours = remainingDuration.hours();
                    var remainingMinutes = remainingDuration.minutes();
                    var remainingSeconds = remainingDuration.seconds();

                    var remainingTimeString = '';
                    if (remainingHours > 0) {
                        remainingTimeString += remainingHours + ' hours ';
                    }
                    if (remainingMinutes > 0) {
                        remainingTimeString += remainingMinutes + ' minutes ';
                    }
                    if (remainingSeconds > 0 || remainingTimeString === '') {
                        remainingTimeString += remainingSeconds + ' seconds ';
                    }
                    remainingTimeString += 'remaining';

                    cleanButton.setAttribute('title', remainingTimeString);

                    new bootstrap.Tooltip(cleanButton);
                }

                (function(name) {
                    cleanButton.addEventListener("click", function() {
                        cleanCoffeeMachine(name);
                    });
                })(employees[i].name);

                var removeButton = document.createElement('button');
                removeButton.type = "button";
                removeButton.className = "btn btn-danger";
                removeButton.innerHTML = "Remove";
                (function(name) {
                    removeButton.addEventListener("click", function() {
                        removeEmployee(name);
                    });
                })(employees[i].name);

                var cell = row.insertCell(4);
                cell.appendChild(drinkButton);
                cell.appendChild(cleanButton);
                cell.appendChild(removeButton);
            }
            // Generate chart data based on employee habits
            var habitsData = generateHabitsData(employees);
            createHabitsChart(habitsData);
        }
    }
    xhr.send();
}

function drinkCoffee(name) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", "/coffee/drink/" + encodeURIComponent(name), true);
    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            // Refresh the table to show the updated data
            loadEmployees();
        }
    }
    xhr.send();
}

function cleanCoffeeMachine(name) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", "/coffee/clean/" + encodeURIComponent(name), true);
    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            // Refresh the table to show the updated data
            loadEmployees();
        }
    }
    xhr.send();
}


function removeEmployee(name) {
    var deleteButton = document.getElementById("confirmDelete");
    $('#deleteModal').modal('show');

    deleteButton.onclick = function() {
        var xhr = new XMLHttpRequest();
        xhr.open("DELETE", "/employees/" + encodeURIComponent(name), true);
        xhr.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                loadEmployees();
            }
        }
        xhr.send();
        $('#deleteModal').modal('hide');
    }
}

function generateHabitsData(employees) {
    var habitsData = {
        labels: [],
        datasets: [{
                label: "Cleans",
                data: [],
                backgroundColor: "rgba(54, 162, 235, 0.5)",
            },
            {
                label: "Drinks",
                data: [],
                backgroundColor: "rgba(255, 99, 132, 0.5)",
            },
        ],
    };

    for (var i = 0; i < employees.length; i++) {
        if (!employees[i].name || !Array.isArray(employees[i].cleans) || !Array.isArray(employees[i].drinks)) {
            continue;
        }
        habitsData.labels.push(employees[i].name);
        habitsData.datasets[0].data.push(employees[i].cleans.length);
        habitsData.datasets[1].data.push(employees[i].drinks.length);
    }

    return habitsData;
}

function generateIndividualHabitsData(employee) {
    var habitsData = {
        labels: ["Cleans", "Drinks"],
        datasets: [{
            label: employee.name,
            data: [employee.cleans.length, employee.drinks.length],
            backgroundColor: ["rgba(54, 162, 235, 0.5)", "rgba(255, 99, 132, 0.5)"],
        }],
    };

    return habitsData;
}

let habitsChart;

function createHabitsChart(habitsData) {
    var ctx = document.getElementById("habitsChart").getContext("2d");
    if (!ctx) {
        console.error('Cannot get context of the element with id "habitsChart". Make sure the element exists.');
        return;
    }

    // If the chart already exists, destroy it.
    if (habitsChart) {
        habitsChart.destroy();
    }

    habitsChart = new Chart(ctx, {
        type: "bar",
        data: habitsData,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0,
                },
            },
        },
    });
}

let backButton;

function createIndividualHabitsChart(habitsData) {
    // Clear the previous chart
    if (habitsChart) {
        habitsChart.destroy();
    }

    // Add a back button to return to the original chart
    if (!backButton) {
        var refreshButton = document.getElementById("refresh");
        backButton = document.createElement("a");
        backButton.classList.add("nav-link", "active");
        backButton.href = '#';
        backButton.innerHTML = "&larr; Back";
        backButton.addEventListener("click", function() {
            loadEmployees();
            this.parentNode.removeChild(this);
            backButton = null;
            refreshButton.classList.add("active");
        });
        refreshButton.classList.remove("active");
        var chartArea = document.getElementById("nav");
        chartArea.appendChild(backButton);
    }

    // Create the new chart
    var ctx = document.getElementById("habitsChart").getContext("2d");
    habitsChart = new Chart(ctx, {
        type: "bar",
        data: habitsData,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0,
                },
            },
        },
    });
}

// load employees on page load
window.onload = loadEmployees;