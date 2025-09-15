// @TODO use this adminService file once Snyk Code for VSCode
// is able to navigate to cross-file paths in the vuln description 
/** 
function isValidRedirectUrl(url) {
  return url && typeof url === 'string' && url.startsWith('/') && !url.includes('://');
}

module.exports.adminLoginSuccess = function(redirectPage, res) {
    console.log({redirectPage})
    if (redirectPage && isValidRedirectUrl(redirectPage)) {
        return res.redirect(redirectPage)
    } else {
        return res.redirect('/admin')
    }
}
*/
