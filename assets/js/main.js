const { ipcRenderer } = require('electron');
const fs = require("fs");
const path = require("path");
const Mousetrap = require('mousetrap');

if ( typeof module === "object" ){

	console.log(ipcRenderer.sendSync('synchronous-message', 'ping')) // prints "pong"

	ipcRenderer.on('asynchronous-reply', (event, arg) => {
	  console.log(arg) // prints "pong"
	})

	ipcRenderer.send('asynchronous-message', 'ping')

}

$(document).ready(function(){

	// Custom Toggle
	$(".custom-control").click(function(){
		var toggle = $(this).children("input");
		toggle.attr("checked", function(){
			return toggle.attr("checked") ? false : true;
		})
	})

	// Open Directory
	$("#cd").click(function(e){
		ipcRenderer.send("open-directory");
	})

	ipcRenderer.on("directory-opened", function(event, filePaths){

		console.log("FilePaths", filePaths)
		if (typeof filePaths == "undefined"){ return };

		var filePath = filePaths[0];

		console.log(filePath);
		$("#cd-input").val(filePath);

		buildImagesFromDirectory(filePath);

	})

	var sortable_obj = new Sortable($(".photo-viewer")[0], {
		animation: 150,  // ms, animation speed moving items when sorting, `0` — without animation
		easing: "cubic-bezier(1, 0, 0, 1)",
		draggable: ".item",
		selectedClass : "photo-viewer-item-selected",
		multiDrag : true,
		multiDragKey : "CTRL"
	})

	var current_directory;
	var active_src;

	function navigateImages(e){

		console.log(e);

		var direction = e.code == "ArrowLeft" ? "left" : "right";

		if (typeof active_src == "undefined" || active_src == null){
			return;
		}

		var current_index = active_src.index() + 1;

		console.log("Current Index", current_index);

		var next_index = (direction == "right") ? (current_index + 1) : (current_index - 1);

		var next_src = $(`.photo-viewer > img:nth-child(${next_index})`);

		if (next_src.length == 0){
			console.log("Could not find index of ", next_src);
		} else {

			console.log("Next Index", next_index, next_src);

			$(".photo-viewer > img.active").removeClass("active");
			active_src = next_src;
			next_src.addClass("active");

			$(".preview-image").attr("src", next_src.attr("src"));

		}
	}

	Mousetrap.bind("left", navigateImages);
	Mousetrap.bind("right", navigateImages);

	function buildImagesFromDirectory(directoryPath){

		$(".photo-viewer").empty();

		$("#cd-input").val(directoryPath);

		fs.readdir(directoryPath, {withFileTypes: true}, function (err, files) {
			//handling error
			if (err) {
				return console.log('Unable to scan directory: ' + err);
			} 

			current_directory = directoryPath;

			//listing all files using forEach
			files.forEach(function (file) {
				// Do whatever you want to do with the file

				if (file.isFile() && (file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".gif"))){
					console.log(file); 

					var img_object = $("<img></img>").addClass("item").attr("src", "file://" + directoryPath + "/" + file.name).attr("file_name", file.name).appendTo($(".photo-viewer"));
					img_object.hover(function(){

						$(".preview-image").attr("src", img_object.attr("src"));

					}, function(){

						if (typeof active_src == "undefined" || active_src == null){
							$(".preview-image").attr("src", null);
						} else {
							$(".preview-image").attr("src", active_src.attr("src"));
						}

					})

					img_object.click(function(e){

						$(".photo-viewer > img.active").removeClass("active");

						if ($(this).hasClass("active")){

							active_src = null;

							$(this).removeClass("active");

							$(".preview-image").attr("src", null);


						} else {

							active_src = $(this);

							$(this).addClass("active");

							$(".preview-image").attr("src", active_src.attr("src"));

						}

						
					})

				}
			});
		});

		$("#generate").click(function(){

			$("#generate").attr("disabled", true);

			console.log("Generating sorted files . . .");

			var output_dir = current_directory;

			if ($("#create-new-directory").attr("checked")){

				output_dir = path.join(current_directory, "/", "sorted");

				if (!fs.existsSync(output_dir)){
					console.log("Creating new output folder");
					fs.mkdirSync(output_dir);
				}

			}

			$(".photo-viewer").children("img").each(function(index){

				var file_name = $(this).attr("file_name");

				console.log(index);

				let input_file = path.join(current_directory, "/", file_name);
				let output_file = path.join(output_dir, "/", index + "_" + file_name);

				fs.createReadStream(input_file).pipe(fs.createWriteStream(output_file));
			})

			$("#generate").attr("disabled", false);

			console.log("Done");

		})

	}

})