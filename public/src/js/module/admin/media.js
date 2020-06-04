/*global $*/
const service = {
    upload: function (file) {
        const $form = $('#form-media');
        const fd = new FormData();
        fd.append('mediafile', file);
        fd.append('original', $('#original').is(':checked') ? 1 : 0);
        fd.append('watermark', $('#watermark').is(':checked') ? 1 : 0);

        $.ajax({
            type: 'post',
            url: $form.attr('action'),
            data: fd,
            processData: false,
            contentType: false,
            headers: {
                'x-csrf-token': $('#csrfToken').val()
            },
            dataType: 'json',
            xhr: function () {
                const xhr = $.ajaxSettings.xhr();
                xhr.upload.addEventListener('progress', function (e) {
                    // let progress = 0;
                    // if (e.lengthComputable) {
                    //     progress = (e.loaded / file.size * 100).toFixed(2);
                    // }
                    // console.log(progress);
                }, false);
                return xhr;
            },
            success: function (d) {
                if (d.status === 200 && d.code === 0) {
                    alert('upload success');
                } else {
                    alert('upload error');
                }
            },
            error: function () {
                return false;
            }
        });
        return false;
    },
    initEvent: function () {
        let file;
        $('#mediafile').on('change', (e) => {
            file = e.target.files[0];
            $('#filename').html(file.name);
        });
        $('#form-media').on('submit', function () {
            service.upload(file);
            return false;
        });
    }
};

$(function () {
    service.initEvent();
});

module.exports = () => {
};
