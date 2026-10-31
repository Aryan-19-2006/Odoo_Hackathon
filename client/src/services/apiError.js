export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  const responseMessage =
    error?.response?.data?.error || error?.response?.data?.message;

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  if (error?.code === 'ECONNABORTED') {
    return 'The request took too long. Please try again.';
  }

  if (error?.isAxiosError && !error.response) {
    return 'Unable to reach the server. Check your connection and try again.';
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
