/*global $,tinymce*/
require('../../lib/jquery.textposition');
require('../../lib/jquery.datepicker');

const service = {
    initEvent: function () {
        $('#post-date').datepicker({
            maxDate: new Date(),
            showOn: 'focus click',
            listenInput: true
        });
        $('#form-post').on('submit', function () {
            const $that = $(this);
            tinymce.triggerSave();
            $.ajax({
                type: 'post',
                url: $that.attr('action'),
                data: $that.serialize(),
                dataType: 'json',
                success: function (d) {
                    if (d.code === 0) {
                        location.href = d.data.url;
                    } else {
                        $('#csrfToken').val(d.token);
                        alert(d.message);
                    }
                },
                error: function (xhr) {
                    const result = xhr.responseJSON || JSON.parse(xhr.responseText);
                    $('#csrfToken').val(result.token);
                    alert(result.message);
                }
            });
            return false;
        }).on('click', '.postStatus', function () {
            if ($('#post-status-password').is(':checked')) {
                $('#post-password-wrap').show();
            } else {
                $('#post-password-wrap').hide();
            }
        }).on('click', '.postOriginal', function () {
            if ($('#post-original-no').is(':checked')) {
                $('#post-source-wrap').show();
                $('#post-author-wrap').show();
            } else {
                $('#post-source-wrap').hide();
                $('#post-author-wrap').hide();
            }
        });
        $('#form-search,#form-filter').on('submit', function () {
            location.href = $(this).attr('action') + '&' + $(this).serialize();
            return false;
        });
    },
    initMce: function () {
        const bar1 = [
            'fontsizeselect fontselect formatselect',
            'bold italic underline strikethrough',
            'codesample blockquote subscript superscript',
            'alignleft aligncenter alignright alignjustify',
            'bullist numlist'
        ];
        const bar2 = [
            'forecolor backcolor',
            'outdent indent',
            'link anchor image media',
            'table insertdatetime',
            'hr pagebreak',
            'pastetext unlink removeformat',
            'visualblocks code preview fullscreen',
            'undo redo'
        ];
        const fonts = [
            '宋体=宋体',
            'Andale Mono=andale mono,times',
            'Arial=arial,helvetica,sans-serif',
            'Arial Black=arial black,avant garde',
            'Book Antiqua=book antiqua,palatino',
            'Comic Sans MS=comic sans ms,sans-serif',
            'Courier New=courier new,courier',
            'Georgia=georgia,palatino',
            'Helvetica=helvetica',
            'Impact=impact,chicago',
            'Symbol=symbol',
            'Tahoma=tahoma,arial,helvetica,sans-serif',
            'Terminal=terminal,monaco',
            'Times New Roman=times new roman,times',
            'Trebuchet MS=trebuchet ms,geneva',
            'Verdana=verdana,geneva',
            'Webdings=webdings',
            'Wingdings=wingdings,zapf dingbats'
        ];
        tinymce.suffix = '.min';
        tinymce.baseURL = '/js/admin';
        // init_instance_callback
        tinymce.init({
            selector: '#post-content',
            height: 400,
            menubar: false,
            language: 'tinymce_cn',
            plugins: [
                'lists link image imagetools preview hr anchor pagebreak',
                'wordcount visualblocks visualchars code fullscreen',
                'insertdatetime media table',
                'paste textcolor colorpicker codesample'
            ],
            toolbar1: bar1.join(' | '),
            toolbar2: bar2.join(' | '),
            'image_advtab': true,
            'imagetools_toolbar': 'rotateleft rotateright | flipv fliph | editimage imageoptions',
            'font_formats': fonts.join(';')
        });
    }
};

$(function () {
    service.initMce();
    service.initEvent();
    $('#post-title').focus();
});

module.exports = () => {
};
