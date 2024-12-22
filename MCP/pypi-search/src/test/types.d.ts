/// <reference types="jest" />
/// <reference types="jest-extended" />

declare module "jest-mock-axios" {
  import { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";

  interface MockAxiosGet {
    (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    mockResolvedValueOnce: (value: AxiosResponse) => void;
    mockRejectedValueOnce: (error: Error) => void;
  }

  interface MockAxios extends Omit<AxiosInstance, "get"> {
    get: MockAxiosGet;
    reset: () => void;
  }

  const mockAxios: MockAxios;
  export default mockAxios;
}

// Add jest-extended matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeArray(): R;
    }
  }
}
