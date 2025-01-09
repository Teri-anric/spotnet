import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from 'utils/axios';
import { notify } from 'components/layout/notifier/Notifier';
import { getWallet } from '../services/wallet';
import { sendExtraDepositTransaction } from '../services/transaction';

export const useAddDeposit = () => {
  const mutation = useMutation({
    mutationFn: async ({ positionId, amount, tokenSymbol }) => {
      if (!positionId) {
        return notify('No position found', 'error');
      }           
      
      try {
        // Get wallet and check/deploy contract
        const wallet = await getWallet();
        const walletId = wallet.selectedAddress;
        const contractAddress = await axiosInstance.get(`/api/get-user-contract?wallet_id=${walletId}`);

        // Prepare extra deposit data
        const extraDepositData = {
          deposit_data: {
            token: tokenSymbol, // This might need to be the actual token address
            amount: amount
          }
        };

        // Send transaction
        const { transaction_hash } = await sendExtraDepositTransaction(extraDepositData, contractAddress.data);

        // Send transaction hash to backend
        const { data } = await axiosInstance.post(`/api/add-extra-deposit/${positionId}`, {
          amount: amount,                 
          token_symbol: tokenSymbol,
          transaction_hash: transaction_hash
        });

        return data;
      } catch (error) {
        notify('Blockchain transaction failed', 'error');
        throw error;
      }
    },
    onSuccess: () => {
      notify('Successfully deposited!', 'success');
    },
    onError: (error) => {
      notify(error.response?.data?.message || 'Failed to process deposit', 'error');
    },
  });

  return mutation;
};
