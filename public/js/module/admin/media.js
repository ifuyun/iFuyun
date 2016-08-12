/*global $*/
define(function (require, exports, module) {
    'use strict';
    var service;

    service = {
        addFile: function () {

        },
        upload: function (file) {
            var fd,
                $form = $('#form-media');

            fd = new FormData();
            fd.append('mediafile', file);

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
                // 此方式无效
                // xhrFields: {
                //     onsendstart: function () {
                //         console.log(this.upload.onprogress);
                //         this.upload.addEventListener('progress', function (e) {
                //             console.log(1, e);
                //         }, false);
                //     }
                // },
                xhr: function () {
                    var xhr = $.ajaxSettings.xhr();
                    xhr.upload.addEventListener('progress', function (e) {
                        var progress = 0;
                        if(e.lengthComputable) {
                            progress = (e.loaded / file.size * 100).toFixed(2);
                        }
                        console.log(progress);
                    }, false);
                    return xhr;
                },
                success: function (d, s, xhr) {
                    if (d.code === 200) {
                        alert('upload success');
                    } else {
                        alert('upload error');
                    }
                },
                error: function (xhr, s, err) {
                    return false;
                }
            });
            return false;
        },
        initEvent: function () {
            $('#mediafile').on('change', function (e) {
                service.upload(e.target.files[0]);
            });
        }
    };

    $(function () {
        service.initEvent();
    });
}); 