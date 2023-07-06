var employeeNameInput = document.getElementById("employeeName");

document.getElementById("add").addEventListener("click", addEmployee);
employeeNameInput.addEventListener("keypress", function(e) {
    if (e.keyCode === 13) { addEmployee(); }
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
            row.insertCell(0).innerHTML = employees[i].name;
            row.insertCell(1).innerHTML = employees[i].last_clean || 'N/A';
            row.insertCell(2).innerHTML = employees[i].total_cleans || '0';
            
            var removeButton = document.createElement('button');
            removeButton.type = "button";
            removeButton.className = "btn btn-danger";
            removeButton.innerHTML = "Remove";

            (function(name) {
                removeButton.addEventListener("click", function() { removeEmployee(name); });
            })(employees[i].name);
            
            var cell = row.insertCell(3);
            cell.appendChild(removeButton);
        }
      }
    }
    xhr.send();
  };

  function removeEmployee(name) {
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", "/employees/" + encodeURIComponent(name), true);
    xhr.onreadystatechange = function() {
      if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        var row = document.getElementById("row-" + name);
        row.parentNode.removeChild(row);
        //alert(JSON.parse(this.responseText).message);
      }
    }
    xhr.send();
  }

  // load employees on page load
  window.onload = loadEmployees;