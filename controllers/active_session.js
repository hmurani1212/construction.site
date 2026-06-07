const active_sessions = require("../models/active_session")

exports.check_active_session = async (req, res, next) => {
    const { _id : account_id } = req.body.account
    const {wa_id: contact_id} = req.body.contact
    if(!account_id || !contact_id)
    {
        return res.status(404).json({
            STATUS: "ERROR",
            ERROR_FILTER: "USER_END_VIOLATION",
            ERROR_CODE: "VTWE-141206884",
            ERROR_DESCRIPTION: "No account id or contact id!",
          });
    }

    const check = await active_sessions.aggregate([{$match: {
        $and: [
            {
                account_id
            },
            {
                contact_id
            }, 
            {
                expiry_time: {
                    $gt: Math.floor(Date.now() / 1000)
                }  
            }
        ]
    }
  }])
  let check_session = true
    if(check.length == 0)
    {
        check_session = false
    }
    req.body.check_active_session = check_session
    next()
}


