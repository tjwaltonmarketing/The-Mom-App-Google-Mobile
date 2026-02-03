$(document).ready(function() {	

	
let lastScroll = 0;

jQuery(window).on("scroll", function () {
    const current = jQuery(this).scrollTop();

    // Show when scrolling UP & passed 500px
    if (current < lastScroll && current > 500) {
        jQuery(".scrolltotop").fadeIn();
    } 
    // Hide when scrolling DOWN or back above threshold
    else {
        jQuery(".scrolltotop").fadeOut();
    }

    lastScroll = current;
});



// Scroll to top on click
jQuery(".scrolltotop").click(function () {
    jQuery("html").animate({ scrollTop: 0 }, 550);
    return false;
});

	// menu area stikcy
	jQuery(window).scroll(function() {
		var srcollTopValue = jQuery(window).scrollTop();

		if (srcollTopValue > 0) {
			jQuery(".header-nav").addClass("menu-sticky")
		} else {
			jQuery(".header-nav").removeClass("menu-sticky")
		}
	});


	// owl slider2 js hook here
		$(".owl-carousel").owlCarousel({
			loop: true,
			// autoplay: true,
			autoplayTimeout: 5000,
			smartSpeed: 200,
			responsive: {
				0: {
					items: 1   // mobile
				},
				576: {
					items: 2   // small tablets
				},
				768: {
					items: 2   // tablets
				},
				992: {
					items: 3   // small desktops
				},
				1200: {
					items: 3   // large desktops
				}
				
			}
		});



		// faq js code 
		$(function() {
			var Accordion = function(el, multiple) {
				this.el = el || {};
				this.multiple = multiple || false;

				var links = this.el.find('.link');
				links.on('click', {el: this.el, multiple: this.multiple}, this.dropdown)
			}

			Accordion.prototype.dropdown = function(e) {
				var $el = e.data.el;
					$this = $(this),
					$next = $this.next();

				$next.slideToggle();
				$this.parent().toggleClass('open');

				if (!e.data.multiple) {
					$el.find('.submenu').not($next).slideUp().parent().removeClass('open');
				}
			}

			var accordion = new Accordion($('#accordion'), false);

			/* ⭐ Open FIRST item by default */
			var firstItem = $('#accordion .link').first();
			firstItem.parent().addClass('open');
			firstItem.next('.submenu').show();
		});









	
		
});



document.addEventListener("click", function (e) {
  const offcanvas = document.querySelector('.offcanvas.show');
  if (!offcanvas) return;

  if (e.target.closest('a')) {
    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
    bsOffcanvas.hide();
  }
});



	 // AOS Initialization
    AOS.init({
        offset: 120,
        delay: 0,
        duration: 1400,
        easing: 'ease',
        once: true,
        mirror: false,
        anchorPlacement: 'top-bottom',
    });


