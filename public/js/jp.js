// License: MIT
// Copyright (C) Denis Spasyuk
// JP version 1.0.4
/*jshint esversion: 8 */

function jp(){}

jp.CSS_COLOR_NAMES=["#3366CC","#DC3912","#FF9900","#109618","#990099","#3B3EAC","#0099C6","#DD4477","#66AA00","#B82E2E","#316395","#994499","#22AA99","#AAAA11","#6633CC","#E67300","#8B0707","#329262","#5574A6","#3B3EAC","#3355CC","#DC2512","#FF8800","#107618","#993399","#3C2EAC","#0077C6","#DD2277","#44AA00","#B81E1E","#312395","#992499","#21AA99","#AABB11","#6611CC","#E55300","#8B0606","#318262","#5562A6","#2B2EAC"];
jp.echart_defaults={animationDuration:function(t){return 10*t},dataZoom:[{show:!1},{type:"inside",disabled:!0},{show:!1}],legend:{show:!0,top:0},toolbox:{showTitle:!1,right:100,feature:{dataView:{readOnly:!1},restore:{},dataZoom:{show:!0,yAxisIndex:"none",brushStyle:{shadowBlur:5,shadowOffsetX:10,shadowColor:"rgba(0, 0, 0, 0.5)",borderType:"solid",borderWidth:0}},saveAsImage:{show:!0}},tooltip:{show:!0,formatter:function(t){return"<div >"+t.title+"</div>"},backgroundColor:"#ddd",textStyle:{fontSize:15},extraCssText:"box-shadow: 0 0 3px rgba(0, 0, 0, 0.1); transform: translate(-80px, -40px);"}},title:{text:"",left:"center",margin:0,padding:5,textStyle:{color:"#ccc"}},xAxis:[],yAxis:[],grid:[{}]};

jp.replace_all = function (str1, str2, ignore) {
  return jp.replace(
    new RegExp(
      str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"),
      ignore ? "gi" : "g"
    ),
    typeof str2 == "string" ? str2.replace(/\$/g, "$$$$") : str2
  );
};

/**maximum value in array*/
jp.get_arr_maximum = function (arr) {
  return Math.max.apply(Math, arr);
};

/**get time now*/
jp.get_time_now = function () {
  return new Date();
};

/**round time*/
jp.round_date = function (dateOBJ, minutes) {
  console.log(minutes, dateOBJ);
  let ms = 1000 * 60 * minutes; // convert minutes to ms
  return new Date(Math.round(dateOBJ.getTime() / ms) * ms);
};

/**returns text inside <a></a> tags*/
jp.get_text_from_link = function (lnk) {
  return lnk.match(/<a[^\b>]+>(.+)[\<]\/a>/)[1];
};

/**array of numbers from start to end*/
jp.range = function (start, end, step) {
  console.log(start, end, step);
  const len = Math.floor((end - start) / step) + 1;
  return Array(len)
    .fill()
    .map((_, idx) => start + idx * step);
};

/**minimum value in array*/
jp.get_arr_minimum = function (arr) {
  return Math.min.apply(Math, arr);
};

/**random id generator*/
jp.get_random_id = function () {
  return (
    "id" +
    [...Array(15)].map(() => (~~(Math.random() * 36)).toString(36)).join("")
  );
};

/**get array depth*/
jp.get_arr_depth = function (value){
    return Array.isArray(value) ? 
      1 + Math.max(0, ...value.map(jp.get_arr_depth)) : 0;
}


/**random numeric id generator*/
// return true if in range, otherwise false
jp.inRange = function (x, min, max) {
  return (x - min) * (x - max) <= 0;
};

/**random numeric id generator*/
jp.get_num_id = function () {
  return Math.floor(Math.random() * 89999 + 10000);
};

/**random arr number generator*/
jp.get_random_arr = function (len) {
  return Array.from(
    {
      length: len,
    },
    () => Math.floor(Math.random() * len)
  );
};

/**isNumber*/
jp.isNumeric = function(str) {
  str = str.toString();
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}
/**random color generator*/
// jp.get_random_color = function () {
//   var color = jp.CSS_COLOR_NAMES[Math.floor(Math.random() * jp.CSS_COLOR_NAMES.length)]
//   return color;
// }
jp.pickRandomProperty = function (obj) {
  var result;
  var count = 0;
  for (var prop in obj) if (Math.random() < 1 / ++count) result = prop;
  return result;
};

jp.get_random_color=function(){var f={red:{300:"#e57373",400:"#ef5350",500:"#f44336",600:"#e53935",700:"#d32f2f",800:"#c62828",900:"#b71c1c",hex:"#f44336",a100:"#ff8a80",a200:"#ff5252",a400:"#ff1744",a700:"#d50000"},pink:{300:"#f06292",400:"#ec407a",500:"#e91e63",600:"#d81b60",700:"#c2185b",800:"#ad1457",900:"#880e4f",hex:"#e91e63",a100:"#ff80ab",a200:"#ff4081",a400:"#f50057",a700:"#c51162"},purple:{300:"#ba68c8",400:"#ab47bc",500:"#9c27b0",600:"#8e24aa",700:"#7b1fa2",800:"#6a1b9a",900:"#4a148c",hex:"#9c27b0",a100:"#ea80fc",a200:"#e040fb",a400:"#d500f9",a700:"#aa00ff"},deepPurple:{300:"#9575cd",400:"#7e57c2",500:"#673ab7",600:"#5e35b1",700:"#512da8",800:"#4527a0",900:"#311b92",hex:"#673ab7",a100:"#b388ff",a200:"#7c4dff",a400:"#651fff",a700:"#6200ea"},indigo:{300:"#7986cb",400:"#5c6bc0",500:"#3f51b5",600:"#3949ab",700:"#303f9f",800:"#283593",900:"#1a237e",hex:"#3f51b5",a100:"#8c9eff",a200:"#536dfe",a400:"#3d5afe",a700:"#304ffe"},blue:{300:"#64b5f6",400:"#42a5f5",500:"#2196f3",600:"#1e88e5",700:"#1976d2",800:"#1565c0",900:"#0d47a1",hex:"#2196f3",a100:"#82b1ff",a200:"#448aff",a400:"#2979ff",a700:"#2962ff"},cyan:{300:"#4dd0e1",400:"#26c6da",500:"#00bcd4",600:"#00acc1",700:"#0097a7",800:"#00838f",900:"#006064",hex:"#00bcd4",a100:"#84ffff",a200:"#18ffff",a400:"#00e5ff",a700:"#00b8d4"},teal:{300:"#4db6ac",400:"#26a69a",500:"#009688",600:"#00897b",700:"#00796b",800:"#00695c",900:"#004d40",hex:"#009688",a100:"#a7ffeb",a200:"#64ffda",a400:"#1de9b6",a700:"#00bfa5"},green:{300:"#81c784",400:"#66bb6a",500:"#4caf50",600:"#43a047",700:"#388e3c",800:"#2e7d32",900:"#1b5e20",hex:"#4caf50",a100:"#b9f6ca",a200:"#69f0ae",a400:"#00e676",a700:"#00c853"},amber:{300:"#ffd54f",400:"#ffca28",500:"#ffc107",600:"#ffb300",700:"#ffa000",800:"#ff8f00",900:"#ff6f00",hex:"#ffc107",a100:"#ffe57f",a200:"#ffd740",a400:"#ffc400",a700:"#ffab00"},deepOrange:{300:"#ff8a65",400:"#ff7043",500:"#ff5722",600:"#f4511e",700:"#e64a19",800:"#d84315",900:"#bf360c",hex:"#ff5722",a100:"#ff9e80",a200:"#ff6e40",a400:"#ff3d00",a700:"#dd2c00"},brown:{300:"#a1887f",400:"#8d6e63",500:"#795548",600:"#6d4c41",700:"#5d4037",800:"#4e342e",900:"#3e2723",hex:"#795548"},black:{hex:"#000000"}},a=f[this.pickRandomProperty(f)];return a[this.pickRandomProperty(a)]};

/**difference between first and second arrays*/
jp.array_diff=function(n,r){return n.filter((function(n){return r.indexOf(n)<0}))};

/**two arrays to object converter*/
jp.arrays_to_obj=function(r,n){for(var o={},t=0;t<r.length;t++)o[r[t]]=n[t];return o};

/**dublicate key in arr of objects*/
jp.add_arr_obj_key=function(r,n,a){for(var e=0;e<r.length;e++)r[e][a]=r[e][n];return r};

jp.replace_all=function(e,p,r){return jp.replace(new RegExp(e.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),r?"gi":"g"),"string"==typeof p?p.replace(/\$/g,"$$$$"):p)};

/** array of arrays to object [[a,b],[c,d],[e,f]] -> {a:b, c:d, e:f}*/
jp.arrofarrs_to_obj=function(r){return r.reduce((function(r,n){return r[n[0]]=n[1],r}),{})};

/** array of objects to array of arrays [{a:1, b:2, c:3}, {a:4, b:5, c:6}] -> {keys:[a, b, c], vals:[[1,2,3], [4,5,6]]*/
jp.arr_objs_objarr=function(r){var e=r.map((function(r){return Object.values(r)})),a=Object.keys(r[0]),n={};return n.keys=a,n.vals=e,n};

/** zip arrays to arr of arrs*/
jp.arr_zip=function(r,...e){return r.map(((r,n)=>e.reduce(((r,e)=>[...r,e[n]]),[r])))};

/**two array to object pair [{x:val, y:val}]*/
jp.arrays_to_xy=function(r,n,t="x",a="y"){for(var o={},u=[],y=0;y<r.length;y++){o[t]=r[y],o[a]=n[y],u.push(o);o={}}return u};

/**auto scale div*/
jp.elm_scale=function(i,n=1,e=!0){var t=document.getElementById(i);t.style.transform=e?"scale("+n/Math.max(t.clientWidth/window.innerWidth,t.clientHeight/window.innerHeight)+")":"scale("+n/Math.min(t.clientWidth/window.innerWidth,t.clientHeight/window.innerHeight)+")"};

/**get unique values from array*/
jp.get_unique = function (arr) {
  return arr.filter((value, index, arr) => {return arr.indexOf(value) === index}).filter(String)};
jp.add_val_to_array=function(r,a){for(var n=r.length;n--;)r[n]=r[n]+a;return r};

jp.random = function (n) {
  return Math.floor(Math.random() * n);
};


/** input [[1,2,3],[4,5,6]] output [5,7,9]*/
jp.sum_columns_arrs = function (arr) {
  var newArray = [];
  arr.forEach(sub => {
     sub.forEach((num, index) => {
        if(newArray[index]){
           newArray[index] += num;
        }else{
           newArray[index] = num;
        }
     });
  });
  return newArray;
}

/**sleep function, jp.sleep(timeout).then(() => {}) or while(true){await jp.sleep(5000); function()};*/
jp.sleep=function(e){return new Promise((n=>setTimeout(n,e)))};

/**convert text to chemical formula*/
jp.text_to_formula=function(t){return t.replace(/\d/g,(function(t){return"<sub>"+t+"</sub>"}))};

/**number to string thousand separated string*/
jp.number_k_separator=function(r){return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",")};

/** form values validation*/
jp.validate_form_field=function(e){if(e.required)return e.value.length>0?(document.getElementById(e.id).style.border="1px dotted green",!0):(document.getElementById(e.id).style.border="1px dotted red",!1)};

jp.split_trim = function(str){
   return str.replace(/^\s+|\s+$/g,'').split(/\s+/)
}

/** get values from an html form*/
jp.get_form_val = function (formid) {
  var data = [];
  var valid = [];
  var validated = false;
  console.log(document.getElementById(formid));
  var ids = document.getElementById(formid).elements.length;
  for (var i = 0; i < ids; i++) {
    var type = document.getElementById(formid).elements.item(i).type;
    if (type != "button") {
      var value = document.getElementById(formid).elements.item(i).value;
      var id = document.getElementById(formid).elements.item(i).id;
      var name = document.getElementById(formid).elements.item(i).name;
      var req = document.getElementById(formid).elements.item(i).required;
      var formval = {
        name: name,
        value: value,
        id: id,
        type: type,
        element: i,
        required: req,
      };
      valid.push(this.validate_form_field(formval));
      data.push(formval);
    }
  }

  if (valid.indexOf(false) != -1) {
    validated = false;
  } else {
    validated = true;
  }
  console.log(validated);
  return { data: data, validated: validated };
};

/** set values to an html form datadict=[{id:"",value:""}]*/
jp.set_form_val = function (theid, datadict) {
  document.getElementById(theid).reset();
  // console.log(theid, datadict);
  for (var i = 0; i < datadict.length; i++) {
    var element = document.getElementById(datadict[i]["id"]);
    if (element.type == "checkbox") {
      element.checked = datadict[i]["value"];
    } else {
      element.value = datadict[i]["value"];
    }
  }
};
/** option creator for select field*/
jp.select_opt_list = function (arr, selectID) {
  var select = document.getElementById(selectID);
  for (var i = 0; i < arr.length; i++) {
    var opt = arr[i];
    var el = document.createElement("option");
    el.textContent = opt;
    el.value = opt;
    select.appendChild(el);
  }
};



/** build form from json {"element_type": "form", "id":"test", "cssclass": "col-xs-3","data": [{element:"label", for:"text1",text:"Field1"}*/
jp.build_form = function (theid, data) {
  document.getElementById(theid).innerHTML = "";
  var html = [];
  html.push('<div class="container">');
  html.push('<form id="' + data.id + '" class="' + data.cssclass + '">');
  // html.push('<div class="form-group">');
  var dat = data.data;
  var spc = " ",
  end = "",
  text = "";
  for (var i = 0; i < dat.length; i++) {
    var elm = dat[i]["element"];
    delete dat[i]["element"];
    if (elm != "input") {
      if (dat[i]["text"] != undefined) {
        text = dat[i]["text"];
        delete dat[i]["text"];
      }
      if (elm == "label") {
        html.push('<div class="form-group">');
        var labindex = i;
      }
      end = text + "</" + elm + ">";
    } else {
      end = "";
    }
    html.push("<"+elm+spc+Object.keys(dat[i]).map((e=>e+'="'+dat[i][e]+'"')).join(" ")+">"+end);
    if (i == labindex + 1) {
      html.push("</div>");
    }
  }
  // html.push("</div>");
  html.push("</form>");
  html.push("</div>");
  console.log(html.join("\n"));
  document.getElementById(theid).innerHTML = html.join("\n");
};

/**update array with object values*/
jp.update_arr_obj = function (dic, arr) {
  for (var i = 0; i < arr.length; i++) {
    if (dic[arr[i]] !== undefined) {
      arr[i] = dic[arr[i]];
    }
  }
  return arr;
};

/**array of objects to array with key from array*/
jp.obj_to_arr = function (arr, key) {
  var newarr = [];
  for (var i = 0; i < arr.length; i++) {
    newarr.push(arr[i][key]);
  }
  return newarr;
};

/**convert number to currency*/
jp.number_to_currency = function (num, round, symbol) {
  var str = symbol + " " + Number(num.toFixed(round)).toLocaleString();
  return str;
};
/**round number*/
jp.round = function (num, round) {
  var r = Number("1" + "0".repeat(round));
  return Math.round(num * r) / r;
};

jp.sumproduct = function (arr1, arr2) {
  var result = 0;
  for (var i = 0; i < arr1.length; i++) {
    result += arr1[i] * arr2[i];
  }
  return result;
};

jp.sum = function (arr1) {
  return arr1.reduce(function (a, b) {
    return a + b;
  }, 0);
};

/**convert currency to number*/
jp.currency_to_number = function (currency) {
  var num = Number(currency.toString().replace(/[$,]+/g, ""));
  return num;
};

/**merge two objects*/
jp.merge_obj = function (obj1, obj2) {
  var total = {};
  for (var i in obj1) {
    total[i] = obj1[i];
  }
  for (var j in obj2) {
    total[j] = obj2[j];
  }
  return total;
};

/**fork array of arrays into two arrays [[a,b], [c,d], [e,f]] -> {arr1:[a, c, e], arr2:[b, d, f]}*/
jp.fork_arrs = function (arr) {
  out_dict = {};
  for (var i = 0; i < arr[0].length; i++) {
    var ar = arr.map(function (a) {
      return a[i];
    });
    out_dict[i] = ar;
  }
  return out_dict;
};

/**Arrays of rows to arrays of columns [[a, b, c], [d, e, f]] = > [[a, d], [b, e], [c, f]]}*/
jp.arr_rows_arr_col = function (arr) {
  var out = [];
  for (var i = 0; i < arr[0].length; i++) {
    out.push(
      arr.map((a) => {
        return a[i];
      })
    );
  }
  return out;
};

/**devides values in arrays [2,4,6] [2,2,2] => [1,2,3]*/
jp.devide_arrs = function (arr1, arr2) {
  var result = [];
  for (var i = 0; i < arr1.length; i++) {
    result.push(parseFloat(arr1[i]) / parseFloat(arr2[i]));
  }
  return result;
};
/**multiply values in arrays [2,4,6] [2,2,2] => [4,8,12]*/
jp.multiply_arrs = function (arr1, arr2) {
  var result = [];
  for (var i = 0; i < arr1.length; i++) {
    result.push(parseFloat(arr1[i]) * parseFloat(arr2[i]));
  }
  return result;
};
/**normalizes values in array from 0 to 1*/
jp.normalize_arr = function (arr) {
  var min = jp.get_arr_minimum(arr);
  var max = jp.get_arr_maximum(arr);
  // console.log(arr)
  return arr.map((item) => {
    return (parseFloat(item) - min) / (max - min);
  });
};

/**Takes filename and return the promise to deliver the contents of the document jp.fetchfile().then((data)=>{$(data).dialog()})*/
jp.fetchfile = async function (filename) {
  return await fetch(filename, {
    mode: "same-origin",
  })
    .then((data) => data.text())
    .then((data) => {
      return data;
    });
};

/**listen for clicks in list accordion*/
jp.on_accordion_click = function (obj) {
  var id = obj.id;
  var oldActiveElement = document.querySelector(".activelist");
  if (oldActiveElement) {
    oldActiveElement.classList.toggle("activelist");
    var panel = oldActiveElement.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  }
  var acc = document.getElementById(id);
  acc.classList.toggle("activelist");
  var panel = acc.nextElementSibling;
  if (panel.style.maxHeight) {
    panel.style.maxHeight = null;
  } else {
    panel.style.maxHeight = panel.scrollHeight + "px";
  }
};

/**Create list from object. arrobj = [{"href":"http://url", "download":"", "text":"link text"}]*/
jp.create_ul_list = function (obj) {
  let data = [];
  if (obj.length > 0) {
    //      console.log(obj[0]["group"]);
    for (var v = 0; v < obj.length; v++) {
      if (data !== undefined) {
        if (obj[v]["download"]) {
          data.push(
            '<a class="list-group-head jp_accordion" href="' +
              obj[v]["href"] +
              '" download="' +
              obj[v]["download"].replace(/^.*[\\\/]/, "") +
              '">' +
              obj[v]["text"] +
              "</a>"
          );
        } else if (obj[v]["group"]) {
          data.push(
            '<a class="list-group-head jp_accordion" id="' +
              obj[v]["id"] +
              '" onclick="jp.on_accordion_click(this)" href="' +
              obj[v]["href"] +
              '">' +
              obj[v]["text"] +
              "</a>"
          );
          data.push(
            '<div class="jp_list-panel" id="' + jp.get_random_id() + '">'
          );
          var gp = obj[v]["group"];
          if (obj[v]["checkbox"] != undefined) {
            for (var g = 0; g < gp.length; g++) {
              if (obj[v]["checkbox"]["function"] != undefined) {
                data.push(
                  '<input class="list-cbox" onclick="' +
                    obj[v]["checkbox"]["function"] +
                    '" type="checkbox" id="' +
                    obj[v]["group"][g]["id"] +
                    '_cb"><a class="list-group-item jp_accordion" id="' +
                    obj[v]["group"][g]["id"] +
                    '" onclick="' +
                    obj[v]["group"][g]["function"] +
                    '" href="' +
                    obj[v]["group"][g]["href"] +
                    '">' +
                    obj[v]["group"][g]["text"] +
                    "</a>"
                );
              } else {
                data.push(
                  '<input class="list-cbox" type="checkbox" id="' +
                    obj[v]["group"][g]["id"] +
                    '_cb"><a class="list-group-item jp_accordion" id="' +
                    obj[v]["group"][g]["id"] +
                    '" onclick="' +
                    obj[v]["group"][g]["function"] +
                    '" href="' +
                    obj[v]["group"][g]["href"] +
                    '">' +
                    obj[v]["group"][g]["text"] +
                    "</a>"
                );
              }
            }
          } else {
            for (var g = 0; g < gp.length; g++) {
              data.push(
                '<a class="list-group-item jp_accordion" id="' +
                  obj[v]["group"][g]["id"] +
                  '" onclick="' +
                  obj[v]["group"][g]["function"] +
                  '" href="' +
                  obj[v]["group"][g]["href"] +
                  '">' +
                  obj[v]["group"][g]["text"] +
                  "</a>"
              );
            }
          }
          data.push("</div>");
        } else {
          data.push(
            '<a class="list-group-head jp_accordion" id="' +
              obj[v]["id"] +
              '" onclick="' +
              obj[v]["function"] +
              '" href="' +
              obj[v]["href"] +
              '">' +
              obj[v]["text"] +
              "</a>"
          );
        }
      }
    }
  } else {
    data.push('<a class="list-group-item">No Entry</a>');
  }
  return data.join("\n");
};

/**Create list from object. arrobj = [{"href":"http://url", "download":"", "text":"link text"}]*/
// {"category":"CLS","label":"Request Form", "icon":"ion-earth", "link":"", "id":"2"},
jp.create_cards = function (tabledata, header) {
  data = [];
  if (tabledata.length > 0) {
    data.push('<div class="row">');
    for (var v = 0; v < tabledata.length; v++) {
      if (data !== undefined) {
        data.push(
          '<div  class="card h-100 col-2 mt-3 mr-3" id="' +
            jp.get_num_id() +
            '">'
        );
        data.push(
          '<div class="card-header">' + tabledata[v][header["title"]] + "</div>"
        );
        data.push(
          '<div class="card-body">' + tabledata[v][header["body"]] + "</div>"
        );
        data.push("</div>");
      }
    }
    data.push("</div>");
  }
  return data.join("\n");
};

/**Function implements file download*/
jp.save_file = function (text, name) {
  const a = document.createElement("a");
  const type = name.split(".").pop();
  a.href = URL.createObjectURL(
    new Blob([text], {
      type: `text/${type === "txt" ? "plain" : type}`,
    })
  );
  a.download = name;
  a.click();
};
/**File extention from file name*/
jp.extension = function (myfilename) {
  var extension = myfilename.substring(myfilename.lastIndexOf(".") + 1);
  return extension.toLowerCase();
};

/**Merges two json objects source > destination */
jp.deep_assign = function (target, source) {
  // taken from https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  Object.keys(source).forEach(function (key) {
    if (
      target.hasOwnProperty(key) &&
      typeof target[key] === "object" &&
      !(target[key] instanceof Array)
    ) {
      jp.deep_assign(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
  return target;
};

jp.saveimage = function (id) {
  //https://stackoverflow.com/questions/11112321/how-to-save-canvas-as-png-image
  var cid = id.split("_")[1] + "a";
  let downloadLink = document.createElement("a");
  downloadLink.setAttribute("download", "Image.png");
  let canvas = document.getElementById(cid);
  let dataURL = canvas.toDataURL("image/png");
  let url = dataURL.replace(
    /^data:image\/png/,
    "data:application/octet-stream"
  );
  downloadLink.setAttribute("href", url);
  downloadLink.click();
};

/**File path truncation function, return a path truncated to maxlength*/
jp.path_truncation = function (str, maxLength, removeFilename) {
  var splitter = str.indexOf("/") > -1 ? "/" : "\\",
    tokens = str.split(splitter),
    removeFilename = !!removeFilename,
    maxLength = maxLength || 25,
    drive = str.indexOf(":") > -1 ? tokens[0] : "",
    fileName = tokens[tokens.length - 1],
    len = removeFilename ? drive.length : drive.length + fileName.length,
    remLen = maxLength - len - 5, // remove the current lenth and also space for 3 dots and 2 slashes
    path,
    lenA,
    lenB,
    pathA,
    pathB;
  //remove first and last elements from the array
  tokens.splice(0, 1);
  tokens.splice(tokens.length - 1, 1);
  //recreate our path
  path = tokens.join(splitter);
  //handle the case of an odd length
  lenA = Math.ceil(remLen / 2);
  lenB = Math.floor(remLen / 2);
  //rebuild the path from beginning and end
  pathA = path.substring(0, lenA);
  pathB = path.substring(path.length - lenB);
  path = drive + splitter + pathA + "..." + pathB + splitter;
  path = path + (removeFilename ? "" : fileName);
  //console.log(tokens, maxLength, drive, fileName, len, remLen, pathA, pathB);
  return path;
};


/** get table data; return body as [[],[],[]] */
jp.get_table_data = function (theid) {
  var table = document.getElementById(theid).getElementsByTagName("tbody")[0];
  var data = [];
  for (var r = 0, n = table.rows.length; r < n; r++) {
    var rowarr = [];
    for (var c = 0, m = table.rows[r].cells.length - 1; c < m; c++) {
      rowarr.push(table.rows[r].cells[c].innerText);
    }
    data.push(rowarr);
  }
  return data;
};

/** make table data from array of objects*/
jp.obj_to_table_data = function (arrobj, tbl, domid) {
  var kval = jp.arr_objs_objarr(arrobj);
  var table = {};
  var order = [];
  order.push(tbl);
  table[tbl] = {
    cssclass: "col-xs-12",
    element_type: "table",
    data: {
      header: kval.keys,
      body: kval.vals,
    },
    options: {},
  };
  table["order"] = order;
  table["dom_id"] = domid;

  return table;
};

/** make header row, set class to values val:::class*/
jp.table_header = function (ohtml, headerclass, header) {
  ohtml.push('<thead class="' + headerclass + '">');
  ohtml.push("<tr>");
  for (i = 0; i < header.length; i++) {
    var val = header[i].toString();
    if (val.includes(":::")) {
      var classth = header[i].split(":::")[1];
      var val = header[i].split(":::")[0];
      var vartd = '<td class ="' + classth + '">';
      ohtml.push(vartd);
      ohtml.push(val);
      ohtml.push("</td>");
    } else {
      ohtml.push("<td>");
      ohtml.push(val);
      ohtml.push("</td>");
    }
  }
  ohtml.push("</tr>");
  ohtml.push("</thead>");
  return ohtml;
};

/**make footer row, set class to values val:::class*/
jp.table_footer = function (ohtml, footerclass, footer) {
  ohtml.push('<tfoot class="' + footerclass + '">');
  ohtml.push("<tr>");
  for (i = 0; i < footer.length; i++) {
    var val = footer[i].toString();
    //console.log("val", val);
    if (val.includes(":::")) {
      var classtf = footer[i].split(":::")[1];
      var val = footer[i].split(":::")[0];
      var vartd = '<td class ="' + classtf + '">';
      ohtml.push(vartd);
      ohtml.push(val);
      ohtml.push("</td>");
    } else {
      ohtml.push("<td>");
      ohtml.push(val);
      ohtml.push("</td>");
    }
  }
  ohtml.push("</tr>");
  ohtml.push("</tfoot>");
  return ohtml;
};
/**delete row button*/
jp.tbl_delete_row = function (el) {
  if (confirm("Are you sure you want to delete the row?")) {
    el.closest("tr").remove();
  }
};

/**make body row, set class to values val:::class*/
jp.make_table_body = function (ohtml, body_class, body, editable = false) {
  var vartr = "<tr>";
  var val = "";
  var edit = "";
  var btns = "";
  if (editable) {
    var edit = 'contenteditable="true"';
    var btns =
      '<td style="vertical-align:bottom"><button style="float:right" class="btn btn-danger editbtn" type="button" onclick="jp.tbl_delete_row(this)">-</button></td>';
  }
  // console.log(edit);
  ohtml.push('<tbody class="' + body_class + '">');
  for (i = 0; i < body.length; i++) {
    for (j = 0; j < body[i].length; j++) {
      if (body[i][j] !== undefined) {
        val = body[i][j];
        val = val.toString();
        vartr = "<tr>";
      } else {
        body[i][j] == " ";
        val = " ";
        vartr = "<tr>";
      }
      if (val.includes(":::")) {
        classtd = body[i][j].split(":::")[1];
        val = body[i][j].split(":::")[0];
        vartd =
          '<td style="vertical-align:middle" ' +
          edit +
          ' class ="' +
          classtd +
          '">';
      } else {
        val = body[i][j];
        vartd = '<td style="vertical-align:middle" ' + edit + " >";
      }
      if (j == 0) {
        ohtml.push("<tr>");
        ohtml.push(vartd);
        ohtml.push(val);
        ohtml.push("</td>");
      } else {
        ohtml.push(vartd);
        ohtml.push(val);
        ohtml.push("</td>");
      }
    }
    ohtml.push(btns + "</tr>");
  }
  return ohtml;
};

/**extract arr1 [x, y] item values from arr2 [[5, 8]] of objects, out=[{x:5, y:8}]*/
jp.maptoobj = function (arr1, arr2) {
  var arrdict = [];
  var dict = {};
  for (var d = 0; d < arr2.length; d++) {
    dict = {};
    for (var i = 0; i < arr1.length; i++) {
      dict[arr1[i]] = arr2[d][i];
    }
    arrdict.push(dict);
  }
  return arrdict;
};

/**search arr for string*/
jp.table_search_filter = function (obj, filter) {
  var arr = Object.values(obj).map((v) => v.innerText);
  return arr.join(" ").toUpperCase().indexOf(filter);
};

/**html table search */
jp.table_search = function (id) {
  // Declare variables
  var input, filter, table, tr, td, i, txtValue;
  input = document.getElementById(id);
  filter = input.value.toUpperCase();
  table = document.getElementById(id.split("-")[1].replace("_search", ""));
  tr = table.getElementsByTagName("tr");
  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td");
    if (td) {
      txtValue = td.textContent || td.innerText;
      //        console.log(td);
      if (this.table_search_filter(td, filter) > -1) {
        //        if (txtValue.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
};

/**add table row in edit mode*/
jp.addTableRow = function (tblid) {
  // console.log("gdfgdfggg",tblid.replace("btn-",""));
  var table = document
    .getElementById(tblid.replace("btn-", ""))
    .getElementsByTagName("tbody")[0];
  var row = table.rows[0];
  var newrow = row.cloneNode(true);
  console.log(newrow);
  for (i = 0; i < newrow.children.length - 1; i++) {
    newrow.children[i].innerText = "";
  }
  console.log(row.children);
  table.insertRow(0).innerHTML = newrow.innerHTML;
};

/**make html table */
jp.make_html_table = function (tabledata, tkey, cssclass, dom_id, append=true) {
  // footer header body
  var data = tabledata["data"];
  var title = "";
  if (tabledata["options"]) {
    var options = tabledata["options"];
    if (options["title"] != undefined) var title = options["title"];
    var editable = options["edit"];
  }
  const table_class = "table table-hover table-condensed";
  const title_class = "caption_class";
  const header_class = "header_class";
  const footer_class = "footer_class";
  const body_class = "body_class";
  const tblid = "jp-" + tkey;
  var ohtml = [];
  if ("body" in data) {
    var body = data["body"];
    if (options["search"] != undefined && options["search"] == true) {
      var search = "jp-" + tkey + "_search";
      ohtml.push(
        '<div class="table_search"><input type="text" id ="' +
          search +
          '" onkeyup="jp.table_search(this.id)" placeholder="Search"></div>'
      );
    }
    if (options["edit"] != undefined && options["edit"] == true) {
      ohtml.push(
        '<div class="table_toolbar"><div class="' +
          title_class +
          '">' +
          title +
          '</div><div><button id="btn-' +
          tblid +
          '"  class="btn btn-success editbtn addbtn" type="button" onclick="jp.addTableRow(this.id)">+</button></div></div>'
      );
    } else {
      if (title) {
        ohtml.push('<div class="' + title_class + '">' + title + "</div>");
      }
    }
  }

  ohtml.push('<table id ="jp-' + tkey + '" class="' + table_class + '">');

  if ("header" in data) {
    var header = data["header"];
    ohtml =jp.table_header(ohtml, header_class, header);
  }
  if ("footer" in data) {
    var footer = data["footer"];
    ohtml =jp.table_footer(ohtml, footer_class, footer);
  }
  if ("body" in data) {
    var body = data["body"];
    ohtml =jp.make_table_body(ohtml, body_class, body, editable);
  }
  ohtml.push("</table>");
  var htm = ohtml.join("\n");
  //  $(dom_id).append('<div class = "'+cssclass+'" id="'+tkey+'"></div>');
  if(append){
    jp.append(dom_id, '<div class = "' + cssclass + '" id="' + tkey + '"></div>');
    jp.append(tkey, htm);
    return false
  }else{
    return htm
  }
};

/** Setup dushboard */
jp.dashboard_setup = function (dashdata, dkey, cssclass, dom_id) {
  var ahtml = [];
  var size = {
    small: [160, 150],
    micro: [160, 35],
    medium: [160, 300],
    large: [400, 520],
    long: [480, 890],
    xlarge: [400, 1060],
    xxlarge: [400, 1600],
  };
  var dash = dashdata["data"];
  var rowwidth = 1300; // (mm)
  if (dashdata["options"]) {
    rowwidth = dashdata["options"]["rowwidth"];
  }
  jp.append(
    dom_id,
    '<div class = "' + cssclass + '" id="' + dkey + '"> </div>'
  );
  //$(dom_id).append('<div class = "' + cssclass + '" id="' + dkey + '"> </div>');
  var appendtbl = [];
  var newrow = false;
  var count = [0, 0];
  for (ix = 0; ix < dash.length; ix++) {
    ahtml.push('<div class="row ">');
    for (j = 0; j < dash[ix].length; j++) {
      count[1] += size[dash[ix][j]["tile"]][1];
      // console.log(count[0], size[dash[ix][j]["tile"]][0]);
      if (count[0] != 0 && count[0] != size[dash[ix][j]["tile"]][0]) {
        newrow = true;
      }
      if (dash[ix][j]["tile"] == "small") {
        ahtml.push('<div class="dash_tile ' + dash[ix][j]["tile"] + ' ">');
        ahtml.push(
          '<div class="dash_header ' + dash[ix][j]["header"]["color"] + '">'
        );
        ahtml.push(
          '<div class="dash_title">' + dash[ix][j]["header"]["title"] + "</div>"
        );
        ahtml.push(
          '<div class="dash_headerdata">' +
            dash[ix][j]["header"]["headerdata"] +
            "</div>"
        );
        ahtml.push("</div>");
        ahtml.push('<div class="dash_bodyfooter">');
        ahtml.push(
          '<div class="dash_title text' +
            dash[ix][j]["header"]["color"] +
            '">' +
            dash[ix][j]["footer"]["footerdata"] +
            "</div>"
        );
        ahtml.push("</div>");
        ahtml.push("</div>");
      } else if (dash[ix][j]["tile"] == "micro") {
        ahtml.push('<div class="dash_tile  ' + dash[ix][j]["tile"] + '">');
        ahtml.push(
          '<div class="left ' +
            dash[ix][j]["header"]["color"] +
            '">' +
            dash[ix][j]["header"]["title"] +
            "</div>"
        );
        ahtml.push(
          '<div class="right text' +
            dash[ix][j]["header"]["color"] +
            '">' +
            dash[ix][j]["header"]["headerdata"] +
            "</div>"
        );
        ahtml.push("</div>");
      } else if (dash[ix][j]["tile"] == "medium") {
        ahtml.push('<div class="dash_tile ' + dash[ix][j]["tile"] + '">');
        ahtml.push(
          '<div class="dash_header ' + dash[ix][j]["header"]["color"] + '">'
        );
        ahtml.push('<div class="left">');
        ahtml.push(
          '<div class="dash_title">' +
            dash[ix][j]["header"]["lefttitle"] +
            "</div>"
        );
        ahtml.push(
          '<div class="dash_headerdata">' +
            dash[ix][j]["header"]["leftdata"] +
            "</div>"
        );
        ahtml.push("</div>");
        ahtml.push('<div class="right">');
        ahtml.push(
          '<div class="dash_title">' +
            dash[ix][j]["header"]["righttitle"] +
            "</div>"
        );
        ahtml.push(
          '<div class="dash_headerdata">' +
            dash[ix][j]["header"]["rightdata"] +
            "</div>"
        );
        ahtml.push("</div>");
        ahtml.push("</div>");
        ahtml.push('<div class="dash_bodyfooter">');
        ahtml.push(
          '<div class="dash_title text' +
            dash[ix][j]["header"]["color"] +
            '">' +
            dash[ix][j]["footer"]["footerdata"] +
            "</div>"
        );
        ahtml.push("</div>");
        ahtml.push("</div>");
      } else if (
        dash[ix][j]["tile"] == "large" ||
        dash[ix][j]["tile"] == "long" ||
        dash[ix][j]["tile"] == "xlarge" ||
        dash[ix][j]["tile"] == "xxlarge"
      ) {
        var css_class = dash[ix][j]["tile"];
        ahtml.push(
          "<div id=large" +
            ix.toString() +
            j.toString() +
            ' class="dash_tile ' +
            css_class +
            '">'
        );
        ahtml.push(
          '<div class="dash_title large_title">' +
            dash[ix][j]["header"]["title"] +
            "</div>"
        );
        ahtml.push("</div>");
        if (dash[ix][j]["options"] !== undefined) {
          for (i = 0; i < dash[ix][j]["options"]["append"].length; i++) {
            var tmp = {};
            tmp["what"] = dash[ix][j]["options"]["append"][i];
            tmp["where"] = "large" + ix.toString() + j.toString();
            appendtbl.push(tmp);
          }
        }
      }
      // console.log(newrow, count[1], count[0]);
      count[0] = size[dash[ix][j]["tile"]][0];
      if (count[1] > rowwidth || newrow == true) {
        ahtml.push('</div><div class="row">');
        count = [0, 0];
        newrow = false;
      }
    }
    ahtml.push("</div>");
  }
 jp.append(dkey, ahtml.join(""));
  if (appendtbl.length > 0) {
    for (id = 0; id < appendtbl.length; id++) {
      // console.log(appendtbl[id]["what"]);
     jp.moveto(appendtbl[id]["what"], appendtbl[id]["where"]);
    }
  }
};

/**append html inside an element or a page*/
jp.append = function (el, str) {
  // console.log(el,str);
  var elt = document.getElementById(el);
  elt.insertAdjacentHTML("beforeend", str);
};

/** move one html element to another  */
jp.moveto = function (el1, el2) {
  var what = document.getElementById(el1);
  var where = document.getElementById(el2);
  // console.log(el1, el2);
  try {
    where.appendChild(what);
  } catch (err) {
    console.log(err);
  }
};

/** invert keys and values in object  */
jp.invert = function (objin) {
  var objout = {};
  for (var key in objin) {
    objout[objin[key]] = key;
  }
  return objout;
};

jp.plot = function (X, Y, options) {
   var tbl={};
   tbl.Chart1 =  jp.gen_chart(X, Y, options);
  //  tbl.order = ["Chart1"];
   tbl.dom_id = options.dom_id;
   var ckey = jp.get_random_id();
   jp.generate_echart(tbl.Chart1, ckey, "col-xs-12", tbl.dom_id);
}

jp.gen_chart =  function (X, Y, options={title:"chart", type:"line"}) {
    var option = {
      title: { show: !0, left: 50, text: options.title },
      element_type: "chart",
      dataZoom: [{
          type: "inside",
          show: !1,
          xAxisIndex: [0, 1],
          filterMode: 'empty'
        }
      ],
      toolbox: {
        top:20,
        show: true,
        feature: {
          // magicType: { show: true, type: ['stack', 'tiled'] },
          saveAsImage: { show: true }
        }
      },
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      xAxis: {
        type:  !isNaN(parseFloat(X[0])) ? 'value' : 'category',
        boundaryGap:  ['0', '0'],
        min: "dataMin",
        max: "dataMax",
        gridIndex: 0,
        axisLine:{lineStyle:{width:2}}
      },
      yAxis: { type: !isNaN(parseFloat(Y[0])) ? 'value' : 'category', show: !0, gridIndex: 0, axisLabel: { show: !0 }, axisLine:{lineStyle:{width:2}}},
      grid: [
        { show:true, borderWidth:1, borderColor:'#ccc', left: '3%', right: '3%', bottom: 20, top: 20, height: "90%", width: "95%" },
        {},
      ],
      series: []};
      var dpf = jp.get_arr_depth(Y);
      if (dpf>1){
        for (var i = 0; i<dpf+1; i++){
            option.series.push({
            data: jp.arr_zip(X[i], Y[i]),
            type: options.type,
            backgroundStyle: { opacity: 1, borderWidth: 1 },
            barWidth: "10%",
            name: options.title,
            color: jp.get_random_color(),
          })
        }
      }else{
          option.series.push({
          data: jp.arr_zip(X, Y),
          type: options.type,
          backgroundStyle: { opacity: 1, borderWidth: 1 },
          barWidth: "10%",
          barGap:"0",
          name: options.title,
          color: jp.get_random_color(),
        })
      }

      return option;
  
};

/**Create chart using echart.js */
jp.chart_from_echart_data = function (chartdata) {
  // console.log("chartdata",chartdata);
  // var xAxisdata = chartdata.xAxis.data;
  const defoption = JSON.parse(JSON.stringify(this.echart_defaults));
  const options =jp.deep_assign(defoption, chartdata);
  var series = chartdata.series;
  // console.log(chartdata, options);
  options.xAxis = options.xAxis;
  options.yAxis = options.yAxis;
  options.series = series;
  // console.log(options);
  return options;
};

/**Create chart element */
jp.create_chart_placer = function (chartdata, ckey, cssclass, dom_id) {
  var chartexist = document.getElementById(ckey);
  if (chartexist) {
    chartexist.remove();
  }
  if (chartdata["canvas_size"] != undefined) {
    var size='style="width:'+chartdata.canvas_size[0]+"px; height:"+chartdata.canvas_size[1]+'px"';
   jp.append(dom_id.replace("#",""),'<div class="jp_chart_container '+cssclass+'" '+size+" id="+ckey+"> </div>");
  } else {
   jp.append(dom_id.replace("#",""),'<div class="jp_chart_container " id='+ckey+"> </div>");
  }
};

/**Create chart using echart.js */
jp.generate_echart = function (chartdata, ckey, cssclass, dom_id) {
  if (chartdata != undefined) {
    if (chartdata.xAxis != undefined) {
      jp.create_chart_placer(chartdata, ckey, cssclass, dom_id);
      var chart =jp.chart_from_echart_data(chartdata);
      chartobj = echarts.init(document.getElementById(ckey), null, {
        renderer: "svg",  
      });
      chartobj.setOption(chart);
    }
  }
  window.onresize = chartobj.resize();
};

/**Create html element  in report*/
jp.html_setup = function (htmldata, hkey, cssclass, dom_id) {
 jp.append(
    dom_id.replace("#", ""),
    '<div class = "' + cssclass + ' " id="' + hkey + '">' + htmldata + "</div>"
  );
};

jp.gauge_setup = function (chartdata, ckey, cssclass, dom_id) {
  chartdata["canvas_size"] = [500, 400];
  var options = {
    toolbox: {
      feature: {
        dataView: {
          readOnly: false,
        },
        saveAsImage: {
          show: true,
        },
      },
    },
    series: [
      {
        type: "gauge",
        startAngle: -140,
        endAngle: -400,
        pointer: {
          show: false,
        },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            borderWidth: 2,
            borderColor: "#fff",
          },
        },
        axisLine: {
          lineStyle: {
            width: 30,
          },
        },
        axisLabel: {
          show: false,
          distance: 50,
        },
        data: [
          {
            value:
              (100 * chartdata.options.value.total) / chartdata.options.maximum,
            name: "Total",
            itemStyle: {
              color: jp.CSS_COLOR_NAMES[0],
            },
            title: {
              offsetCenter: ["0%", "-40%"],
            },
            detail: {
              offsetCenter: ["0%", "-25%"],
            },
          },
          {
            value:
              (100 * chartdata.options.value.mx) / chartdata.options.maximum,
            name: "Health",
            color: "auto",
            itemStyle: {
              color: jp.CSS_COLOR_NAMES[1],
            },
            title: {
              offsetCenter: ["0%", "25%"],
            },
            detail: {
              offsetCenter: ["0%", "40%"],
            },
          },
        ],
        detail: {
          width: 50,
          height: 14,
          fontSize: 14,
          color: "auto",
          borderWidth: 0,
          formatter: function (value) {
            return (
              "$" +
              jp.number_k_separator(
                (value * chartdata.options.maximum) / 100
              )
            );
          },
        },
      },
    ],
  };

  var chartexist = document.getElementById(ckey);
  if (chartexist) {
    chartexist.remove();
  }
  jp.append(
    dom_id.replace("#", ""),
    '<div style="width:' +
      chartdata["canvas_size"][0] +
      "px; height:" +
      chartdata["canvas_size"][1] +
      'px" id=' +
      ckey +
      ' class = "jp_chart_container ' +
      cssclass +
      '"> <div  id=' +
      ckey +
      ckey +
      ' style="float:left" ></div>'
  );
  jp.append(
    ckey + ckey,
    '<button class = "save_button" id="save_' +
      ckey +
      '" onclick="jp.downloadimage(this.id)"><i class="fas fa-download  "></i></button>'
  );
  var myChart = echarts.init(document.getElementById(ckey));
  myChart.setOption(options);
};


jp.generate_report = function (dashdata) {
  var cssclass = "col-xs-12 col-md-12";
  var report_keys = dashdata["order"];
  var dom_id = dashdata["dom_id"];
  if (report_keys==undefined) {
    report_keys = Object.keys(dashdata);
  }

  if (dom_id==undefined) {
    const newdiv = document.createElement('div');
    newdiv.id = dom_id = jp.get_random_id();
    document.body.appendChild(newdiv);
  }
  console.log(dom_id);
  if ("title" in dashdata) {
    var report_title = dashdata["title"];
    jp.append(dom_id,'<div class="titleclass"><center><h1>' + report_title + "</h1></center><br><br>");
  }
  for (var i = 0; i < report_keys.length; i++) {
    if (dashdata[report_keys[i]]["element_type"] == "table") {
      var tabledata = dashdata[report_keys[i]];
      var tkey = report_keys[i];
      cssclass = tabledata["cssclass"];
      jp.make_html_table(tabledata, tkey, cssclass, dom_id);
    } else if (dashdata[report_keys[i]]["element_type"] == "chart") {
      var chartdata = dashdata[report_keys[i]];
      var ckey = report_keys[i];
      cssclass = chartdata["cssclass"];
      jp.generate_echart(chartdata, ckey, cssclass, dom_id);
    } else if (dashdata[report_keys[i]]["element_type"] == "gage") {
      var gid = report_keys[i];
      var gagedata = dashdata[report_keys[i]];
      cssclass = gagedata["cssclass"];
      jp.gauge_setup(gagedata, gid, cssclass, dom_id);
    } else if (dashdata[report_keys[i]]["element_type"] == "html") {
      var htmldata = dashdata[report_keys[i]];
      var hkey = report_keys[i];
      cssclass = htmldata["cssclass"];
      jp.html_setup(htmldata["data"], hkey, cssclass, dom_id);
    } else if (dashdata[report_keys[i]]["element_type"] == "dashboard") {
      var dashboarddata = dashdata[report_keys[i]];
      var dkey = report_keys[i];
      cssclass = dashboarddata["cssclass"];
      jp.dashboard_setup(dashboarddata, dkey, cssclass, dom_id);
    } 
  }
};


try {
  module.exports = exports = jp;
} catch (e) {}
