const s3Util = require('./s3-util'),
	childProcessPromise = require('./child-process-promise'),
	path = require('path'),
	os = require('os'),
	OUTPUT_BUCKET = process.env.OUTPUT_BUCKET,
	RESOLUTION = process.env.RESOLUTION;

exports.handler = async (event, context) => {
	const message = JSON.parse(event.Records[0].body);
	const eventObject = JSON.parse(message.Message)

	const eventRecord = eventObject.Records && eventObject.Records[0],
		inputBucket = eventRecord.s3.bucket.name,
		key = eventRecord.s3.object.key,
		id = context.awsRequestId,
		resultKey = key.replace('.mp4', '') + `-${RESOLUTION}.mp4`,
		workdir = os.tmpdir(),
		inputFile = path.join(workdir,  id + path.extname(key)),
		outputFile = path.join(workdir, 'converted-' + id + '.mp4');

	console.log('converting', inputBucket, key, 'using', inputFile);
	const downloadedFile = await s3Util.downloadFileFromS3(inputBucket, key, inputFile);

	await childProcessPromise.spawn(
			'/opt/bin/ffmpeg',
			['-loglevel', 'error', '-y', '-i', inputFile, '-s', RESOLUTION, '-f', 'mp4',  outputFile],
			{env: process.env, cwd: workdir}
	)
	await s3Util.uploadFileToS3(OUTPUT_BUCKET, resultKey, outputFile);
};