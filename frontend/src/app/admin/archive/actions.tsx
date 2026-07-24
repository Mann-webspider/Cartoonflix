import axios,{ AxiosResponse }  from "axios";

export const getArchiveMovies = async (): Promise<{ data?: any, error?: string }> => {
    try {
      const res:AxiosResponse = await axios.get("http://localhost:5000/api/v1/admin/content?archive=true");
  
      
      if (res.status != 200) {
        throw new Error(res.data.message);
      }
  
      return {data:res.data.content};
    } catch (error: any) {
      return { error: error };
    }
  };
  