export class AddressWidget extends HTMLElement {

    tmpl;

    EXTERNAL_SOURCE_PATH = {
        css: '/address-component/address-widget.component.css'
    }

    REST_API = 'https://cors-anywhere.herokuapp.com/https://www.postdirekt.de/plzserver/PlzAjaxServlet';

    INPUTFIELD;
    DATALIST;

    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: 'open' });

        // Link external css
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = this.EXTERNAL_SOURCE_PATH.css;

        // Attach link to shadowRoot
        this.shadowRoot.append(linkElement);

        // Create Template
        this.tmpl = document.createElement('template');
    }

    /**
     *  ConnectedCallback is invoked each time the custom element is appended into a document-connected element
     */
    connectedCallback() {
        fetch('../address-component/address-widget.component.html')
            .then(r => r.text())
            .then(t => {
                /**
                 * Attach Widget Template to shadowRoot
                 */
                this.tmpl.innerHTML = t;
                this.shadowRoot.append(this.tmpl.content.cloneNode(true));

                /**
                 * Initialize Form
                 */
                this.INPUTFIELD = {
                    ZIPCODE: this.shadowRoot.querySelector('input#zip-code'),
                    CITY: this.shadowRoot.querySelector('input#city'),
                    STREET: this.shadowRoot.querySelector('input#street'),
                    HOUSENUMBER: this.shadowRoot.querySelector('input#house-number'),
                    COUNTRY: this.shadowRoot.querySelector('input#country')
                };
                this.DATALIST = {
                    CITIES: this.shadowRoot.querySelector('datalist#suggestions-cities'),
                    DISTRICTS: this.shadowRoot.querySelector('datalist#suggestions-districts'),
                    STREETS: this.shadowRoot.querySelector('datalist#suggestions-streets')
                }

                this.INPUTFIELD.ZIPCODE.addEventListener('keyup', this.suggestCitiesByZipCode.bind(this));
                this.INPUTFIELD.CITY.addEventListener('input', this.suggestStreetsByDistrict.bind(this));
                this.INPUTFIELD.STREET.addEventListener('keyup', this.jumpToHouseNumber.bind(this));

                const INFO_BUTTON = this.shadowRoot.querySelector('button#info-button');
                INFO_BUTTON.addEventListener('click', this.collectAddressData.bind(this));
            });
    }

    suggestCitiesByZipCode() {
        // Get
        const value = this.INPUTFIELD.ZIPCODE.value; // e.g. "78532 - Tuttlingen"
        const zipCode = value.split(' - ')[0];
        const length = zipCode.length;

        if (length == 3 || length == 4) this.synchronizeDatalistCities(zipCode);
        else if (length == 5) this.autofillCity();
        else this.clearDatalist(this.DATALIST.CITIES);
    }

    jumpToHouseNumber() {
        
        const street = this.INPUTFIELD.STREET.value;
        const opts = this.DATALIST.STREETS.childNodes;
        
        for (const opt of opts) {
            if (street == opt.value) this.INPUTFIELD.HOUSENUMBER.focus();
        }
    }

    /**
     * Only relevant if there are suggested districts of a city.
     * When the user chooses an item (district), then this function fetches the streets by the district & renders it on the datalist (=> SUGGEST)
     */
    async suggestStreetsByDistrict() {
        const district = this.INPUTFIELD.CITY.value;
        const opts = this.DATALIST.DISTRICTS.childNodes;
        for (const opt of opts) {
            if (district == opt.value) {
                // Get
                const zipCode = this.INPUTFIELD.ZIPCODE.value;
                const city = opt.textContent.split(' (')[0]; // e.g. "Tuttlingen (78532)"
                // Fetch
                const streetsRes = await this.fetchStreets(zipCode, city, district);
                const streets = streetsRes.rows;
                // Render
                this.renderStreets(streets);
                // Go ahead
                this.INPUTFIELD.STREET.focus();
                this.clearInputfield(this.INPUTFIELD.STREET);
            }
        }
    }

    collectAddressData() {
        alert('Output in the console!');
        const address = {
            zip: this.INPUTFIELD.ZIPCODE.value,
            city: this.INPUTFIELD.CITY.value,
            street: this.INPUTFIELD.STREET.value,
            houseNumber: this.INPUTFIELD.HOUSENUMBER.value,
            country: this.INPUTFIELD.COUNTRY.value,
        }
        console.table(address);
        // Clear all
        for (const [key, value] of Object.entries(this.INPUTFIELD)) {
            if (key != 'COUNTRY') this.clearInputfield(value);
        }
    }

    async fetchCities(zipCode) {
        const response = await fetch(this.REST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: `finda=city&city=${zipCode}&lang=de_DE`
        });
        const bodyOfResponse = await response.json();
        return bodyOfResponse;
    }

    async fetchStreets(zipCode, city, district = '') {
        const response = await fetch(this.REST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: `finda=streets&plz_plz=${zipCode}&plz_city=${city}&plz_district=${district}&lang=de_DE`
        });
        const bodyOfResponse = await response.json();
        return bodyOfResponse;
    }

    async synchronizeDatalistCities(zipCode) {

        // Fetch & initializie cities
        const bodyOfResponse = await this.fetchCities(zipCode);
        const cities = bodyOfResponse.rows;

        // Display them correctly
        if (cities) this.updateDatalistCities(cities);
        else this.clearDatalist(this.DATALIST.CITIES);

    }

    updateDatalistCities(fetchedArray) {

        // Create a Set, avoid displaying dublicates
        let array = [];
        fetchedArray.forEach(cityObj => {
            array.push(`${cityObj.plz} - ${cityObj.city}`);
        })
        const set = new Set(array);

        this.renderCities(set);
    }

    async autofillCity() {

        const value = this.INPUTFIELD.ZIPCODE.value; // e.g. "78532 - Tuttlingen" || "78532"  --> SPLIT & SEPERATE DATA

        // Initialize zip-code
        const zipCode = value.split(' - ')[0];
        this.setZipCode(zipCode);

        // Initialize city
        let city = value.split(' - ')[1]; // :string || undefined

        if (!city) {

            let customizedDatalist = [];
            this
                .DATALIST
                .CITIES
                .childNodes
                .forEach(item => {
                    const zipCode = item.value.split(' - ')[0];
                    const city = item.value.split(' - ')[1];
                    customizedDatalist.push(`${zipCode} - ${city}`); // :string[] e.g. ['78532 - Tuttlingen', ...]
                })

            const filteredDatalist = customizedDatalist.filter(optionValue => optionValue.split(' - ')[0] == zipCode);

            // DETECT, WHETHER DATALIST (OF CITIES) IS DISPLAYING EXACTLY 1 OPTION. ONLY THEN AUTOCOMPLETE
            if (filteredDatalist.length == 1) {
                const optionValue = filteredDatalist[0];
                city = optionValue.split(' - ')[1];
                this.clearDatalist(this.DATALIST.CITIES);
            }

        } else this.clearDatalist(this.DATALIST.CITIES);

        if (city) {
            const cityRes = await this.fetchCities(zipCode);

            if (cityRes.city) {
                const districts = cityRes.rows;
                this.renderCityDistricts(districts);
                this.INPUTFIELD.CITY.focus();
                this.clearInputfield(this.INPUTFIELD.CITY);
            }
            else {
                this.setCity(city);
                const cityResHasStreets = cityRes.rows[0]["street"];
                let streets;
                if (cityResHasStreets) streets = cityRes.rows;
                else {
                    const streetsRes = await this.fetchStreets(zipCode, city);
                    streets = streetsRes.rows;
                }
                this.renderStreets(streets);
                this.INPUTFIELD.STREET.focus();
            }
        }
    }

    setCity(city) {
        this.INPUTFIELD.CITY.value = city;
    }

    setZipCode(zipCode) {
        this.INPUTFIELD.ZIPCODE.value = zipCode;
    }

    clearDatalist(datalist) {
        datalist.innerHTML = '';
    }

    clearInputfield(inputfield) {
        inputfield.value = '';
    }

    renderCities(cities) {
        this.clearDatalist(this.DATALIST.CITIES);
        cities.forEach(zipAndCity => { this.DATALIST.CITIES.innerHTML += this.generateCityOption(zipAndCity) });
    }

    renderCityDistricts(destricts) {
        this.clearDatalist(this.DATALIST.DISTRICTS);
        destricts.forEach(district => { this.DATALIST.DISTRICTS.innerHTML += this.generateDistrictOption(district) });
    }

    renderStreets(streets) {
        this.clearDatalist(this.DATALIST.STREETS);
        streets.forEach(street => { this.DATALIST.STREETS.innerHTML += this.generateStreetOption(street) });
    }

    generateCityOption(zipAndCity) {
        return `<option value="${zipAndCity}"></option>`;
    }

    generateDistrictOption(district) {
        return `<option value="${district["district"]}">${district["city"]} (${district["district"]})</option>`;
    }

    generateStreetOption(street) {
        return `<option value="${street["street"]}">${street["city"]} (${street["plz"]})</option>`;
    }

    /**
     * Invoked each time the custom element is disconnected from the document's DOM
     */
    disconnectedCallback() {
        // ...
    }

    /**
     * Invoked each time the custom element is moved to a new document
     */
    adoptedCallback() {
        // ...
    }

    /**
     * Invoked each time one of the custom element's attributes is added, removed, or changed
     * @param {*} name 
     * @param {*} oldValue 
     * @param {*} newValue 
     */
    attributeChangedCallback(name, oldValue, newValue) {
        // ...
    }
}
