console.log('Hello World! says "app.js"');

const externalSourcePath = './employees.json';

const restApi = 'https://cors-anywhere.herokuapp.com/https://www.postdirekt.de/plzserver/PlzAjaxServlet';

const ok = '//www.postdirekt.de/plzserver/PlzAjaxServlet';

const fetchCities = async (zipCode) => {
    const response = await fetch(ok, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: `finda=city&city=${zipCode}&lang=de_DE`
    });
    const bodyOfResponse = await response.json();
    return bodyOfResponse;
}

const datalist = document.querySelector('datalist#suggestions-city');

const createOption = (zipCode, city) => {
    const opt = document.createElement('option');
    opt.value = zipCode;
    opt.textContent = city;
    return opt;
}

const updateDatalist = arr => {
    // Clear
    datalist.innerHTML = '';
    // Append option(s)
    arr.forEach(item => {
        const zipCode = item.plz;
        const city = item.city;
        const opt = createOption(zipCode, city);
        datalist.append(opt);
    })
}

const synchronizeDatalist = async () => {

    const zipCode = document.getElementById("zip-code").value;
    const length = document.getElementById("zip-code").value.length;

    if (length == 3 || length == 4) {

        // Fetch & initializie rows
        const bodyOfResponse = await fetchCities(zipCode);
        const rows = bodyOfResponse.rows;

        // Display them correctly
        if (rows) updateDatalist(rows);
        else datalist.innerHTML = '';

    } else {
        datalist.innerHTML = '';
    }
}

const autofill = () => {

    const length = document.getElementById("zip-code").value.length;

    if (length == 5) {

        const zipCode = document.getElementById("zip-code").value;
        const opts = document.getElementById('suggestions-city').childNodes;

        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === zipCode) {
                // An item was selected from the list!
                console.log(opts[i].textContent);
                break;
            }
        }

    }
}