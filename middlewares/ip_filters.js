exports.ip_filter = (req, res, next) =>
{
  var rawIP = req.ip.split(":");
  var ip = rawIP[3];
  const octet1 = ip.split(".")[0];
  const octet2 = ip.split(".")[1];
  
  
  
  if (octet1 == "172" && octet2 == "18") {
    next();
  } else res.status(403).json({ message: "Access Blocked to " + req.ip });
};
