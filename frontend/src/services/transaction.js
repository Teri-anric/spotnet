import { getWallet } from './wallet';
import { CallData } from 'starknet';
import { erc20abi } from '../abis/erc20';
import { abi } from '../abis/abi';
import { axiosInstance } from '../utils/axios';
import { checkAndDeployContract } from './contract';
import { notify, ToastWithLink } from '../components/layout/notifier/Notifier';

export async function sendTransaction(loopLiquidityData, contractAddress) {
  try {
    const wallet = await getWallet();

    if (!loopLiquidityData.pool_key || !loopLiquidityData.deposit_data) {
      throw new Error('Missing or invalid loop_liquidity_data fields');
    }
    console.log(loopLiquidityData);
    let approveCalldata = new CallData(erc20abi);
    const approveTransaction = {
      contractAddress: loopLiquidityData.deposit_data.token,
      entrypoint: 'approve',
      calldata: approveCalldata.compile('approve', [contractAddress, loopLiquidityData.deposit_data.amount]),
    };
    console.log(loopLiquidityData);
    const callData = new CallData(abi);
    const compiled = callData.compile('loop_liquidity', loopLiquidityData);
    const depositTransaction = {
      contractAddress: contractAddress,
      entrypoint: 'loop_liquidity',
      calldata: compiled,
    };
    console.log(depositTransaction);
    let result = await wallet.account.execute([approveTransaction, depositTransaction]);

    console.log('Resp: ');
    console.log(result);
    notify(
      ToastWithLink(
        'Transaction successfully sent',
        `https://starkscan.co/tx/${result.transaction_hash}`,
        'Transaction ID'
      ),
      'success'
    );

    return {
      loopTransaction: result.transaction_hash,
    };
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

export async function sendExtraDepositTransaction(extraDepositData, contractAddress) {
  try {
    const wallet = await getWallet();
    const userContractAddress = contractAddress;

    // Prepare approve calldata
    const approveCalldata = new CallData(erc20abi);
    const token = extraDepositData.deposit_data.token;
    const amount = extraDepositData.deposit_data.amount;

    const compiledApproveCalldata = approveCalldata.compile('approve', [
      userContractAddress, 
      amount
    ]);

    // Prepare extra deposit calldata
    const extraDepositCalldata = new CallData(abi);
    const compiledExtraDepositCalldata = extraDepositCalldata.compile('extra_deposit', [
      token, 
      amount
    ]);

    // Prepare transactions
    const approveTransaction = {
      contractAddress: token,
      entrypoint: 'approve', 
      calldata: compiledApproveCalldata
    };

    const extraDepositTransaction = {  
      contractAddress: userContractAddress,
      entrypoint: 'extra_deposit',
      calldata: compiledExtraDepositCalldata
    };

    // Execute transactions
    const result = await wallet.account.execute([
      approveTransaction, 
      extraDepositTransaction
    ]);

    // Notify user
    notify(
      ToastWithLink(
        'Extra Deposit Transaction successfully sent',
        `https://starkscan.co/tx/${result.transaction_hash}`,
        'Transaction ID'
      ),
      'success'
    );

    return {
      transaction_hash: result.transaction_hash,
    };
  } catch (error) {
    console.error('Error sending extra deposit transaction:', error);
    throw error;
  }
}

/* eslint-disable-next-line no-unused-vars */
async function waitForTransaction(txHash) {
  const wallet = await getWallet();

  let receipt = null;
  while (receipt === null) {
    try {
      receipt = await wallet.provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.log('Waiting for transaction to be accepted...');
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before trying again
    }
  }
  console.log('Transaction accepted:', receipt);
}

export async function closePosition(transactionData) {
  const callData = new CallData(abi);
  const compiled = callData.compile('close_position', transactionData);
  const wallet = await getWallet();

  let result = await wallet.account.execute([
    { contractAddress: transactionData.contract_address, entrypoint: 'close_position', calldata: compiled },
  ]);
  notify(
    ToastWithLink(
      'Close position successfully sent',
      `https://starkscan.co/tx/${result.transaction_hash}`,
      'Transaction ID'
    ),
    'success'
  );
  return result;
}

export const handleTransaction = async (connectedWalletId, formData, setTokenAmount, setLoading) => {
  setLoading(true);
  try {
    await checkAndDeployContract(connectedWalletId);
  } catch (error) {
    console.error('Error deploying contract:', error);
    notify('Error deploying contract. Please try again.', 'error');
    setLoading(false);
    return;
  }
  try {
    const response = await axiosInstance.post(`/api/create-position`, formData);

    const transactionData = response.data;
    const { loopTransaction: transaction_hash } = await sendTransaction(transactionData, transactionData.contract_address);
    console.log('Transaction executed successfully');

    const openPositionResponse = await axiosInstance.get(`/api/open-position`, {
      params: { position_id: transactionData.position_id, transaction_hash },
    });

    // FIXME: this is a hack to eslint (no-unused-vars)
    openPositionResponse == openPositionResponse;

    setTokenAmount('');
  } catch (err) {
    console.error('Failed to create position:', err);
    notify(`Error sending transaction: ${err}`, 'error');
  } finally {
    setLoading(false);
  }
};
