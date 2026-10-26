// Initialize page controls and SVG behavior after the document is ready.
document.addEventListener("DOMContentLoaded", function () {
	// Cache page elements and track selected color, painted paths, and completion state.
	var musicToggle = document.getElementById("music-toggle");
	var music = document.getElementById("background-music");
	var selectedColor = null;
	var selectedFill = null;
	var paletteColors = document.querySelectorAll(".palette svg");
	var pumpkin = document.getElementById("pumpkin");
	var paintRegions = pumpkin.querySelectorAll(".paint-region");
	var pumpkinPaths = pumpkin.querySelectorAll("path:not(.non-interactive)");
	var paintedPaths = new Set();
	var progressBar = document.querySelector(".progress-bar");
	var progressFill = document.querySelector(".progress-fill");
	var clearCanvasButton = document.querySelector(".clear-canvas");
	var completionDialog = document.querySelector(".completion-dialog");
	var completionStarted = false;

	// Expose a simple switch for hiding or showing every region number at once.
	window.setRegionNumbersHidden = function (hidden) {
		pumpkin.classList.toggle("numbers-hidden", Boolean(hidden));
	};

	// Read center/offset overrides from the path first, then its paint-region group.
	function getRegionDataValue(path, region, name) {
		var attribute = "data-" + name;
		var value = path.hasAttribute(attribute)
			? path.getAttribute(attribute)
			: region.getAttribute(attribute);

		if (value === null) {
			return null;
		}

		if (value.trim() === "") {
			throw new Error("The " + attribute + " value cannot be empty.");
		}

		var number = Number(value);
		if (!Number.isFinite(number)) {
			throw new Error("Invalid " + attribute + ' value "' + value + '".');
		}

		return number;
	}

	// Estimate a region's center by averaging evenly spaced points along its outline.
	function getSampledPathCenter(path) {
		var totalLength = path.getTotalLength();
		if (!Number.isFinite(totalLength) || totalLength <= 0) {
			throw new Error("Cannot position a region number on a path with no measurable length.");
		}

		var sampleCount = Math.max(24, Math.min(200, Math.ceil(totalLength / 4)));
		var sumX = 0;
		var sumY = 0;

		for (var index = 0; index < sampleCount; index += 1) {
			var point = path.getPointAtLength((index / sampleCount) * totalLength);
			sumX += point.x;
			sumY += point.y;
		}

		return {
			x: sumX / sampleCount,
			y: sumY / sampleCount
		};
	}

	// Position labels using sampled centers, explicit centers, and optional adjustments.
	paintRegions.forEach(function (region) {
		var path = region.querySelector("path");
		var regionNumber = region.querySelector(".region-number");
		var center = getSampledPathCenter(path);
		var centerX = getRegionDataValue(path, region, "center-x");
		var centerY = getRegionDataValue(path, region, "center-y");
		var offsetX = getRegionDataValue(path, region, "offset-x") || 0;
		var offsetY = getRegionDataValue(path, region, "offset-y") || 0;

		regionNumber.setAttribute("x", String((centerX === null ? center.x : centerX) + offsetX));
		regionNumber.setAttribute("y", String((centerY === null ? center.y : centerY) + offsetY));
	});

	// Keep the background audio in sync with the toggle and user interaction.
	function updateMusicPlayback() {
		if (musicToggle.checked) {
			if (music.paused) {
				music.play().catch(function () {});
			}
		} else {
			music.pause();
		}
	}

	musicToggle.addEventListener("change", updateMusicPlayback);
	document.addEventListener("pointerdown", updateMusicPlayback);
	document.addEventListener("keydown", updateMusicPlayback);
	updateMusicPlayback();

	// Select a palette color and use its computed SVG fill for subsequent painting.
	paletteColors.forEach(function (paletteColor) {
		paletteColor.addEventListener("click", function () {
			paletteColors.forEach(function (color) {
				color.classList.remove("is-selected");
			});
			paletteColor.classList.add("is-selected");
			selectedColor = paletteColor.id;
			selectedFill = window.getComputedStyle(paletteColor.querySelector("circle")).fill;
		});
	});

	// Fill clicked regions, hide their labels, and update completion progress.
	pumpkin.addEventListener("click", function (event) {
		var path = event.target.closest("path");
		if (!selectedColor || !path || !pumpkin.contains(path) || path.classList.contains("non-interactive")) {
			return;
		}

		path.style.fill = selectedFill;
		paintedPaths.add(path);
		var regionNumber = path.closest(".paint-region").querySelector(".region-number");
		regionNumber.classList.add("is-hidden");

		var progress = Math.round((paintedPaths.size / pumpkinPaths.length) * 100);
		progressBar.setAttribute("aria-valuenow", String(progress));
		if (progress === 100) {
			progressFill.style.removeProperty("clip-path");
			progressFill.classList.add("is-complete");
			completionStarted = true;
		} else {
			progressFill.style.clipPath = "inset(0 " + (100 - progress) + "% 0 0)";
		}
	});

	// Show the completion dialog after the progress animation finishes.
	progressFill.addEventListener("transitionend", function (event) {
		if (event.propertyName === "clip-path" && completionStarted) {
			completionDialog.showModal();
		}
	});

	completionDialog.addEventListener("click", function (event) {
		if (event.target === completionDialog) {
			completionDialog.close();
		}
	});

	// Restore region fills and labels, reset progress, and clear completion state.
	function clearCanvas() {
		paintedPaths.forEach(function (path) {
			path.style.removeProperty("fill");
			path.closest(".paint-region").querySelector(".region-number").classList.remove("is-hidden");
		});
		paintedPaths.clear();
		progressFill.style.removeProperty("clip-path");
		progressFill.classList.remove("is-complete");
		progressBar.setAttribute("aria-valuenow", "0");
		completionStarted = false;
	}

	clearCanvasButton.addEventListener("click", clearCanvas);
});
