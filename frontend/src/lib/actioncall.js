const axios = require("axios")

const deleteSingleItem= async (id)=>{
    
    const {data} = await axios.delete(`${process.env.BACKEND_URL}/api/v1/admin/content/${id}`)
    return data
  }

module.exports={deleteSingleItem}