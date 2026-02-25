const errorHandler = (err,req,res,next)=>{
    const statusCode = err.statusCode || 500


     if(statusCode === 404){
        return res.status(404).render("404",{
             message:err.message
        })
    
     }

      if(statusCode === 500){
        return res.status(500).render("500",{
          message:err.message
        })
      }
      
       if(statusCode === 400){
        return res.status(400).render("400",{
          message:err.message
        })
       }


}

module.exports = errorHandler


