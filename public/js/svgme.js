var svgme = {};

svgme.extractSvgFromText = function(text) {
        // Regular expression to match SVG tags
        var svgRegex = /<svg[^>]*>([\s\S]*?)<\/svg>/i;
        // Match SVG tag in the provided text
        var match = text.match(svgRegex);
        // If match is found
        if (match && match[0]) {
            // Return the matched SVG code
            return match[0];
        } else {
            // Return null if no SVG code is found
            return false;
        }
    }

svgme.convertSvgToHtml = function(ell, svgText) {
        // Create a temporary container element
        var newDiv = document.createElement("div");
        ell.innerHTML=ell.innerHTML.replace(svgText, "");
        newDiv.classList.add("vcenter");
        var container = ell.appendChild(newDiv);
        // Set the innerHTML of the container to the provided SVG text
        container.innerHTML = svgText.trim();
        // Select the first SVG element in the container
        var svgElement = container.querySelector('svg');
        // If SVG element is found
        if (svgElement) {
            // Convert SVG element to string
            var svgString = new XMLSerializer().serializeToString(svgElement);
            // Return HTML-compatible SVG string
            return svgString;
        } else {
            // Return null if no SVG element is found
            return false;
        }
    }

    svgme.extractBodyFromText = function(text) {
        if (text){
        var bodyreg =  /<script[^>]*>([\s\S]*?)<\/script>/i;
        var match = text.match(bodyreg);
        // If match is found
        if (match && match[0]) {
            // Return the matched SVG code
            return match[0].replace("<script>", "").replace("</script>", "");
        } else {
            // Return null if no SVG code is found
            return false;
        }
    }else{
        return false;
    }
}
    
    svgme.extractHTMLFromText = function(text) {
            // Regular expression to match SVG tags
            var htmlreg =  /<!DOCTYPE html[^>]*>([\s\S]*?)<\/html>/i;
            // Match HTML tag in the provided text
            var match = text.match(htmlreg);
            // If match is found
            console.log(match);
            if (match && match[0]) {
                // Return the matched SVG code
                return match[0];
            } else {
                // Return null if no SVG code is found
                return false;
            }
        }
    
    svgme.embedHTML = function(ell, htmlText) {
            // Create a temporary container element
            var scr = document.createElement("script");
            // ell.innerHTML=ell.innerHTML.replace(htmlText, "");
            // newDiv.classList.add("vcenter");
            var container = ell.appendChild(scr);
            // Set the innerHTML of the container to the provided SVG text
            container.text = htmlText.trim();
            // Select the first SVG element in the container
           // var htmlElement = container.querySelector('svg');
       
        }
    
    



