var fs = require("fs");

/**
 * Loads some data saved onto a file in json
 * @param {String} path - Path of the file containing the JSON data to load
 * @param {Boolean} [raw = false] - True if you need the raw json data to be returned
 * @returns {*} - Whatever data the file was or null if no data was loaded
 */
function loadDataFromJsonFile(path,raw = false){
	var data = null;
	try{
        var jsonData = fs.readFileSync(path);
        if(!raw){
            data = JSON.parse(jsonData.toString());
        }
        else{
            data = jsonData;
        }
	}
	catch(err){
		console.log("Error " + err.code + " reading file: " + path);
	}
	return data;
}

/**
 * Saves the data passed to it in the file
 * @param {*} data - The data object to save on the file 
 * @param {String} path - The path (filename included) of the file where to save the data
 */
function saveDataToJsonFile(data,path){
	var jsonData = JSON.stringify(data);
	fs.writeFile(path,jsonData,function(err){
		if(err){
			console.log("Error saving data to file " + err.code);
		}
	});
}

module.exports.loadDataFromJsonFile = loadDataFromJsonFile;
module.exports.saveDataToJsonFile = saveDataToJsonFile;