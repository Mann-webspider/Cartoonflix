import axios,{ AxiosResponse }  from "axios";

export const getMovieEdit = async (id:string): Promise<{ data?: any, error?: string }> => {
    try {
      const res:AxiosResponse = await axios.get(`http://localhost:5000/api/v1/admin/content/${id}`);
  
      
      if (res.status != 200) {
        throw new Error(res.data.message);
      }
  
      return {data:res.data.content};
    } catch (error: any) {
      return { error: error };
    }
  };
  