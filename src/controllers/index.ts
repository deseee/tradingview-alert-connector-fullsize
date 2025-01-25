import express, { Router } from 'express';
import { validateAlert } from '../services';
import { DexRegistry } from '../services/dexRegistry';
import { getStrategiesDB } from '../helper';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	res.send('OK');
});

router.get('/accounts', async (req, res) => {
	console.log('Received GET request.');

	const dexRegistry = new DexRegistry();
	const dexNames = ['dydxv3', 'dydxv4', 'perpetual', 'gmx', 'bluefin'];
	const dexClients = dexNames.map((name) => dexRegistry.getDex(name));

	try {
		const accountStatuses = await Promise.all(
			dexClients.map((client) => client.getIsAccountReady())
		);

		const message = {
			dYdX_v3: accountStatuses[0], // dydxv3
			dYdX_v4: accountStatuses[1], // dydxv4
			PerpetualProtocol: accountStatuses[2], // perpetual
			GMX: accountStatuses[3], // gmx
			Bluefin: accountStatuses[4] // bluefin
		};
		res.send(message);
	} catch (error) {
		console.error('Failed to get account readiness:', error);
		res.status(500).send('Internal server error');
	}
});

router.post('/', async (req, res) => {
	console.log('Recieved Tradingview strategy alert:', req.body);

	// Replace the size {{STORED_POSITION}} with the storedPosition in myStrategies.json if sending individual sell/buy alerts  //New Code by deseee
	if (typeof req.body.size === 'string' && req.body.size.includes('{{STORED_POSITION}}')) {
		const [db, rootData] = getStrategiesDB();
   		const storedPosition = rootData[req.body.strategy]?.position || 0;
		req.body.size = req.body.size.replace('{{STORED_POSITION}}', Math.abs(storedPosition).toString());
  	}

	// Replace Sell position size with the storedPosition in myStrategies.json if using {{strategy.order.action}} alerts.  Comment out for default behavior.  //New Code by deseee
  	if (req.body.order === 'sell') {
    		const [db, rootData] = getStrategiesDB();
    		const storedPosition = rootData[req.body.strategy]?.position || 0;
   		const absPosition = Math.abs(storedPosition);

   	 	// Remove all size-related fields
   	 	delete req.body.size;
   	 	delete req.body.sizeByLeverage;
    	 	delete req.body.sizeUsd;
	
		// Add the stored position as size
   	 	req.body.size = absPosition.toString();
 	}

	const validated = await validateAlert(req.body);
	if (!validated) {
		res.send('Error. alert message is not valid');
		return;
	}
		
	// set dydxv3 by default for backwards compatibility
	const exchange = req.body['exchange']?.toLowerCase() || 'dydxv3';

	const dexClient = new DexRegistry().getDex(exchange);

	if (!dexClient) {
		res.send(`Error. Exchange: ${exchange} is not supported`);
		return;
	}

	// TODO: add check if dex client isReady 

	try {
		const result = await dexClient.placeOrder(req.body);

		res.send('OK');
		// checkAfterPosition(req.body);
	} catch (e) {
		res.send('error');
	}

});

router.get('/debug-sentry', function mainHandler(req, res) {
	throw new Error('My first Sentry error!');
});

export default router;
