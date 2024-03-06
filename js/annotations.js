/* Annotations definition */
function createAnnotation(
  id,
  scene,
  titleText,
  position,
  cameraPosition,
  cameraTarget,
  descriptionText
) {
  // Create title and description elements
  let titleElement = $(`<span>${titleText}</span>`);
  // Create Potree.Annotation instance
  let annotation = new Potree.Annotation({
    position: position,
    title: titleElement,
    cameraPosition: cameraPosition,
    cameraTarget: cameraTarget,
    description: descriptionText,
  });
  // Assigning unique ID from database
  annotation.customId = id;
  // Set the annotation to be visible
  annotation.visible = true;
  // Add the annotation to the scene
  scene.annotations.add(annotation);
  // Override toString method for the title element
  titleElement.toString = () => titleText;
}

function saveAnnotation(
  title,
  description,
  positionArray,
  camPositionArray,
  camTargetArray
) {
  // Use AJAX to send data to the PHP script for insertion
  $.ajax({
    type: "POST",
    url: "database/insert_annotation.php", // Adjust the URL based on your file structure
    data: {
      title: title,
      description: description,
      pos_x: positionArray[0],
      pos_y: positionArray[1],
      pos_z: positionArray[2],
      campos_x: camPositionArray[0],
      campos_y: camPositionArray[1],
      campos_z: camPositionArray[2],
      tarpos_x: camTargetArray[0],
      tarpos_y: camTargetArray[1],
      tarpos_z: camTargetArray[2],
      // Add additional parameters as needed
    },
    success: function (id) {
      // Use the returned ID to create the annotation
      createAnnotation(
        id,
        bridgescene, // Assuming bridgescene is accessible globally
        title,
        positionArray,
        camPositionArray,
        camTargetArray, // You can set camera target to camera position or adjust as needed
        description
      );
    },
    error: function (error) {
      console.error("Error saving annotation:", error);
    },
  });

  console.log("Annotation created");
}

function showEditForm(annotation) {
  // Populate the custom form fields with existing annotation data
  document.getElementById("title").value = annotation.title;
  document.getElementById("description").value = annotation.description;
  document.getElementById("position").value = annotation.position
    .toArray()
    .join(", ");

  // Show the custom form
  document.getElementById("customAnnotationForm").style.display = "flex";
  // Show edit button
  editButton = document.getElementById("editAnnotation");
  editButton.style.display = "flex";

  // Attach an event listener to the edit button
  document
    .getElementById("editAnnotation")
    .addEventListener("click", function () {
      // Retrieve values from the form
      let newTitle = document.getElementById("title").value;
      let newDescription = document.getElementById("description").value;
      let newPositionInput = $("#position").val();

      // Split position input into an array
      let positionArray = newPositionInput
        .split(",")
        .map((value) => parseFloat(value.trim()));
      console.log(positionArray);

      // Update the annotation in the scene
      annotation.title.text(newTitle);
      annotation.description = newDescription;

      // Retrieve camera positions and targets
      let camPositionArray;
      let camTargetArray;

      // Check if window.viewer is defined before attempting to access the camera position
      if (
        window.viewer &&
        window.viewer.scene &&
        window.viewer.scene.getActiveCamera
      ) {
        try {
          camPositionArray = window.viewer.scene
            .getActiveCamera()
            .position.toArray();
          console.log("Camera Position:", camPositionArray);
          camTargetArray = window.viewer.scene.view.getPivot().toArray();
          console.log("Target Position:", camTargetArray);
        } catch (error) {
          console.error("Error getting camera position:", error);
          console.error("Error getting target position:", error);
        }
      } else {
        console.error(
          "Viewer not properly initialized. Make sure 'window.viewer' is defined."
        );
      }

      // Remove the existing annotation from the scene
      removeAnnotationFromScene(annotation);

      // Update the annotation in the database
      updateAnnotationInDatabase(
        annotation.customId,
        newTitle,
        newDescription,
        positionArray,
        camPositionArray,
        camTargetArray
      );

      // Hide the custom form after submission
      document.getElementById("customAnnotationForm").style.display = "none";
    });
}

function updateAnnotationInDatabase(
  id,
  newTitle,
  newDescription,
  newPositionArray,
  camPositionArray,
  camTargetArray
) {
  // Use AJAX to send data to the PHP script for updating
  $.ajax({
    type: "POST",
    url: "database/update_annotation.php",
    data: {
      id: id,
      newTitle: newTitle,
      newDescription: newDescription,
      newPositionArray: newPositionArray.join(","), // Send as a comma-separated string
      camPositionArray: camPositionArray.join(","), // Send as a comma-separated string
      camTargetArray: camTargetArray.join(","), // Send as a comma-separated string
    },
    success: function (response) {
      console.log("Annotation id: ", id);
      console.log("Annotation updated in the database");
      // Use the returned ID to create the annotation
      createAnnotation(
        id,
        bridgescene, // Assuming bridgescene is accessible globally
        newTitle,
        newPositionArray,
        camPositionArray,
        camTargetArray, // You can set camera target to camera position or adjust as needed
        newDescription
      );
    },
    error: function (error) {
      console.error("Error updating annotation in the database:", error);
    },
  });
}

function deleteAnnotation(annotation) {
  let confirmation = confirm(
    "Are you sure you want to delete this annotation?"
  );
  if (confirmation) {
    // Assuming you have an 'id' property assigned to the annotation
    let annotationId = annotation.customId;
    // Call a function to remove the annotation from the scene
    removeAnnotationFromScene(annotation);
    // Call a function to delete the record from the database
    deleteAnnotationFromDatabase(annotationId);
  }
}

function removeAnnotationFromScene(annotation) {
  // Code to remove the annotation from the Potree scene
  viewer.scene.annotations.remove(annotation);
}

function deleteAnnotationFromDatabase(annotationId) {
  // Use AJAX to send a request to delete the record from the database
  $.ajax({
    type: "POST",
    url: "database/delete_annotation.php",
    data: {
      id: annotationId,
    },
    success: function (response) {
      console.log("Annotation deleted from the database");
    },
    error: function (error) {
      console.error("Error deleting annotation:", error);
    },
  });
}

// Load existing annotations from the server
$.ajax({
  type: "GET",
  url: "database/load_annotations.php", // Adjust the URL based on your file structure
  dataType: "json",
  success: function (existingAnnotations) {
    // Assuming bridgescene is available globally, adjust if needed
    let scene = bridgescene;

    // Create Potree annotations for each existing record
    existingAnnotations.forEach((annotation) => {
      createAnnotation(
        annotation.id,
        scene,
        annotation.title,
        [annotation.pos_x, annotation.pos_y, annotation.pos_z],
        [annotation.campos_x, annotation.campos_y, annotation.campos_z],
        [annotation.tarpos_x, annotation.tarpos_y, annotation.tarpos_z],
        annotation.description
      );
    });
  },
  error: function (error) {
    console.error("Error loading existing annotations:", error);
  },
});

//CODE FOR CUSTOM FORM//
$(document).ready(function () {
  // Add a click event handler to the #addAnnotationBtn button
  $("#addAnnotationBtn").click(function () {
    // Display the custom form panel
    annoForm = document.getElementById("customAnnotationForm");
    annoForm.style.display = "flex";
    submitButton = document.getElementById("submitAnnotation");
    submitButton.style.display = "flex";
  });
});

// Add a click event handler to the #submitAnnotation button
$("#submitAnnotation").click(function () {
  // Get values from the form fields
  let title = $("#title").val();
  let description = $("#description").val();
  let positionInput = $("#position").val();

  // Split position input into an array
  let positionArray = positionInput
    .split(",")
    .map((value) => parseFloat(value.trim()));
  console.log(positionArray);

  let camPositionArray;

  // Check if window.viewer is defined before attempting to access the camera position
  if (
    window.viewer &&
    window.viewer.scene &&
    window.viewer.scene.getActiveCamera
  ) {
    try {
      camPositionArray = window.viewer.scene
        .getActiveCamera()
        .position.toArray();
      console.log("Camera Position:", camPositionArray);
      camTargetArray = window.viewer.scene.view.getPivot().toArray();
      console.log("Target Position:", camTargetArray);
    } catch (error) {
      console.error("Error getting camera position:", error);
      console.error("Error getting target position:", error);
    }
  } else {
    console.error(
      "Viewer not properly initialized. Make sure 'window.viewer' is defined."
    );
  }

  // Save the annotation with the values from the form
  saveAnnotation(
    title,
    description,
    positionArray,
    camPositionArray,
    camTargetArray
  );

  // Hide the custom form panel
  annoForm = document.getElementById("customAnnotationForm");
  annoForm.style.display = "none";
  submitButton = document.getElementById("submitAnnotation");
  submitButton.style.display = "none";
});

// Add a click event handler to the #pickPointButton button
$("#pickPointButton").click(function () {
  const measurement = viewer.measuringTool.startInsertion({
    showDistances: false,
    showAngles: false,
    showCoordinates: true,
    showArea: false,
    closed: true,
    maxMarkers: 1,
    name: "Point",
  });
  // Listen for the marker_dropped event
  measurement.addEventListener("marker_dropped", (e) => {
    // Get the coordinates of the picked point
    const coordinates = e.measurement.points[0].position.toArray();

    // Format the coordinates as a string (format: x, y, z)
    const selectedPoint = coordinates.join(", ");

    // Update the input box for the position with the selected point
    $("#position").val(selectedPoint);

    // Remove the measurement from the scene
    viewer.scene.removeMeasurement(measurement);
  });
});
