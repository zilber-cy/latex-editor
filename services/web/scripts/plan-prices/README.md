A nodejs tool for reading plans prices from csv files and creating JSON objects.

Run `npm install` in order to install the dependencies.

The scripts will put the output results into the `output` folder.

### Create localized and group plan pricing

_Command_ `node plans.js -f fileName -o outputdir` - generates three json files:

- `localizedPlanPricing.json` for `/services/web/config/settings.overrides.saas.js`
- `plans.json` for `/services/web/frontend/js/main/plans.js`
- `groups.json` for `/services/web/app/templates/plans/groups.json`

The input file can be in `.csv` or `.json` format

- `.csv` csv format
- `.json` json format from the `recurly_prices.js --download` script output
