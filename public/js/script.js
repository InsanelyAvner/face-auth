$.getScript( "./js/face-api.min.js" )
.done(function() {
    const firebaseConfig = {
        apiKey: "AIzaSyBtmJQ0m7NjqOrGwH3BbFmmiVuzq6TT1NA",
        authDomain: "avnersg-auth.firebaseapp.com",
        databaseURL: "https://avnersg-auth-default-rtdb.firebaseio.com",
        projectId: "avnersg-auth",
        storageBucket: "avnersg-auth.appspot.com",
        messagingSenderId: "600053865237",
        appId: "1:600053865237:web:c1c7effff053777108a71c"
    };

    firebase.initializeApp(firebaseConfig);

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const authId = urlParams.get('id')

    const video = document.getElementById('videoInput')
    let numDetections = 0
    
    Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models') //heavier/accurate version of tiny face detector
    ]).then(start)
    
    function start() {
        
        navigator.getUserMedia(
            { video:{} },
            stream => video.srcObject = stream,
            err => console.error(err)
        )
        
        //video.src = '../videos/speech.mp4'
        console.log('video added')
        recognizeFaces()
    }
    
    async function recognizeFaces() {
    
        const labeledDescriptors = await loadLabeledImages()
        // console.log(labeledDescriptors)
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.7)
    
        const canvas = faceapi.createCanvasFromMedia(video)
        document.getElementById("video-container").append(canvas)
    
        const displaySize = { width: video.width, height: video.height }
        faceapi.matchDimensions(canvas, displaySize)
    
            
    
        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()
    
            const resizedDetections = faceapi.resizeResults(detections, displaySize)
    
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    
            const results = resizedDetections.map((d) => {
                return faceMatcher.findBestMatch(d.descriptor)
            })
            results.forEach( (result, i) => {
                const box = resizedDetections[i].detection.box
                const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
                drawBox.draw(canvas)
                if (result._label == "Avner") {
                    numDetections++
                    // console.log(numDetections)
                }
    
                if (numDetections >= 30) {
                    // Avner Detected
                    firebase.database().ref(authId).set({status: "success"});
                    // window.close()
                }
            })
        }, 100)
    }
    
    
    function loadLabeledImages() {
        //const labels = ['Black Widow', 'Captain America', 'Hawkeye' , 'Jim Rhodes', 'Tony Stark', 'Thor', 'Captain Marvel']
        const labels = ['Avner', 'Mama',] // for WebCam
        return Promise.all(
            labels.map(async (label)=>{
                const descriptions = []
                for(let i=1; i<=2; i++) {
                    const img = await faceapi.fetchImage(`../labeled_images/${label}/${i}.jpg`)
                    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                    // console.log(label + i + JSON.stringify(detections))
                    descriptions.push(detections.descriptor)
                }
    
                return new faceapi.LabeledFaceDescriptors(label, descriptions)
    
            })
        )
    }
})
