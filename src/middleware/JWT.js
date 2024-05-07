const {sign, verify} = require ("jsonwebtoken");
const crypto = require('crypto');
const { role } = require("../../models");

const secureRandomBytes = crypto.randomBytes(32); // 32 bytes for a 256-bit key

const secureKey = 'Xzrt5rPond0LGEsuoQ5ZIIN77FdH_I62E80lKxDVj3A'

const createToken = (user,res) => {
    const accessToken  = sign({phoneNo:user.phoneNo, userId:user.id ,roleId:user.roleId}, secureKey);
    res.header("Authorization", `Bearer ${accessToken}`);

    return accessToken;

};

const validateToken =(allowedRoles) => async (req, res, next) => {
    // Extract the token from the Authorization header
    const authHeader = req.headers["authorization"];
    
  
    if (authHeader) {
        const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"
         // Verify the token

        try{
            const validToken= verify(token, secureKey);
           
            
            if(validToken){
                req.authenticated= true
                try {
        
                    const roleId = validToken.roleId;
                    
                    const roleexist = await role.findByPk(roleId);
                    
            
                    if (roleexist) {
                        if (allowedRoles.includes(roleexist.name)) {
                            req.userRole = roleexist.name;
                            return next();
                        } else {
                            return res.status(403).json({ error: "Forbidden. Insufficient role privileges." });
                        }
                    } else {
                        return res.status(404).json({ error: "Role not found." });
                    }
                } catch (err) {
                    // Log the error on the server side
                    console.error(err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                
                 
            }

        }catch(err){
            return res.status(401).json({ error: err });
        }
      
        // Verify the token
       
    } else {
        return res.status(401).json({ error: "Unauthorized" });
    }
};







module.exports = {createToken, validateToken};