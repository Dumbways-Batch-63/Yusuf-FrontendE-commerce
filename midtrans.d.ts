interface MidtransResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  pdf_url?: string;
  finish_redirect_url?: string;
}

interface MidtransError {
  status_code?: string;
  status_message?: string;
  validation_messages?: string[];
}

interface Window {
  snap: {
    pay: (
      token: string,
      options: {
        onSuccess: (result: MidtransResult) => void;
        onPending: (result: MidtransResult) => void;
        onError: (result: MidtransError | unknown) => void;
        onClose: () => void;
      }
    ) => void;
  };
}
