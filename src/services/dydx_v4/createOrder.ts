import {
	CompositeClient,
	Network,
	BECH32_PREFIX,
	LocalWallet,
	OrderExecution,
	OrderSide,
	OrderTimeInForce,
	OrderType,
	SubaccountClient
} from '@dydxprotocol/v4-client-js';
import { deriveHDKeyFromEthereumSignature } from '@dydxprotocol/v4-client-js/build/src/lib/onboarding';
import config = require('config');
import 'dotenv/config';
import { ethers } from 'ethers';

export const dydxV4CreateOrder = async () => {
	const client = await CompositeClient.connect(Network.testnet());

	const mnemonic = process.env.DYDX_V4_MNEMONIC;
	const wallet = ethers.Wallet.fromMnemonic(mnemonic);

	const toSign = {
		domain: {
			name: 'dYdX V4',
			chainId: 11155111
		},
		primaryType: 'dYdX',
		types: {
			EIP712Domain: [
				{
					name: 'name',
					type: 'string'
				},
				{
					name: 'chainId',
					type: 'uint256'
				}
			],
			dYdX: [
				{
					name: 'action',
					type: 'string'
				}
			]
		},
		message: {
			action: 'dYdX Chain Onboarding'
		}
	};

	const signature = await wallet._signTypedData(
		toSign.domain,
		{ dYdX: toSign.types.dYdX },
		toSign.message
	);
	console.log('Signed Data:', signature);
	const k = deriveHDKeyFromEthereumSignature(signature);

	const lw = await LocalWallet.fromMnemonic(k.mnemonic, BECH32_PREFIX);
	console.log('Address:', lw.address);

	const subaccount = new SubaccountClient(lw, 0);
	const clientId = 123; // set to a number, can be used by the client to identify the order
	const market = 'TIA-USD'; // perpertual market id
	const type = OrderType.MARKET; // order type
	const side = OrderSide.BUY; // side of the order
	const timeInForce = OrderTimeInForce.GTT; // UX TimeInForce
	const execution = OrderExecution.IOC;
	const price = 16.9; // price of 30,000;
	const size = 0.1; // subticks are calculated by the price of the order
	const postOnly = false; // If true, order is post only
	const reduceOnly = false; // if true, the order will only reduce the position size
	const triggerPrice = null; // required for conditional orders

	const tx = await client.placeOrder(
		subaccount,
		market,
		type,
		side,
		price,
		size,
		clientId
		// timeInForce,
		// 60,
		// execution,
		// postOnly,
		// reduceOnly,
		// triggerPrice
	);
};
